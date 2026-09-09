'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  Sliders,
  MailQuestion,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building,
  Phone,
  Mail,
  Wrench,
  Clock,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  KeyRound,
  Laptop,
  LogOut,
  Lock,
} from 'lucide-react';
import {
  fetchPlatformSettings,
  updatePlatformSettings,
  fetchMaintenanceSettings,
  updateMaintenanceSettings,
  fetchInquiries,
  updateInquiryStatus,
  fetchAuditLogs,
  PlatformSettings,
  MaintenanceSettings,
  ContactInquiryItem,
  AuditLogItem,
} from '../../../services/adminApi';
import {
  adminChangePassword,
  fetchAdminSessions,
  revokeOtherAdminSessions,
  getAdminUser,
  AdminSessionItem,
} from '../../../services/authApi';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({
    siteName: 'Wonderful Jodi',
    supportEmail: 'support@wonderfuljodi.com',
    supportPhone: '+91 096075 59547',
    tollFreeNumber: '+91 096075 59547',
    officeAddress: 'A303, Gera Imperium Gateway, Nashik Phata, PCMC, Pune, Maharashtra 411034',
    maintenanceMode: false,
    maintenanceBanner: false,
    maintenanceTitle: "We'll Be Back Soon",
    maintenanceMessage: 'Wonderful Jodi is currently undergoing scheduled maintenance. Please check back shortly.',
    maintenanceEstimatedEndTime: null,
    allowAdminAccess: true,
    allowNewRegistrations: true,
    requireEmailVerification: false,
    requireManualProfileApproval: true,
    currency: 'INR',
    razorpayLiveMode: false,
    minAgeMale: 21,
    minAgeFemale: 18,
    maxPhotoUploadLimit: 6,
  });

  const [inquiries, setInquiries] = useState<ContactInquiryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [adminSessions, setAdminSessions] = useState<AdminSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);

  // Modal State for Maintenance Confirmation
  const [showMaintenanceModal, setShowMaintenanceModal] = useState<boolean | null>(null); // true = enable, false = disable

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsData, inquiriesData, logsData, sessionsData] = await Promise.all([
        fetchPlatformSettings().catch(() => null),
        fetchInquiries().catch(() => []),
        fetchAuditLogs().catch(() => []),
        fetchAdminSessions().catch(() => []),
      ]);

      if (settingsData) setSettings(settingsData);
      setInquiries(inquiriesData || []);
      setAuditLogs(logsData || []);
      setAdminSessions(sessionsData || []);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updatePlatformSettings(settings);
      setSettings(updated);
      setNotice({ type: 'success', message: 'Platform configuration settings saved successfully!' });
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to update settings:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to save settings. Please try again.';
      setNotice({ type: 'error', message: errMsg });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenanceMode = (targetState: boolean) => {
    // Open confirmation modal
    setShowMaintenanceModal(targetState);
  };

  const handleConfirmMaintenanceToggle = async () => {
    if (showMaintenanceModal === null) return;
    const targetState = showMaintenanceModal;
    setSavingMaintenance(true);
    try {
      const updated = await updateMaintenanceSettings({
        maintenanceMode: targetState,
        maintenanceBanner: settings.maintenanceBanner,
        maintenanceTitle: settings.maintenanceTitle,
        maintenanceMessage: settings.maintenanceMessage,
        maintenanceEstimatedEndTime: settings.maintenanceEstimatedEndTime,
        allowAdminAccess: settings.allowAdminAccess,
      });

      setSettings((prev) => ({
        ...prev,
        maintenanceMode: updated.maintenanceMode,
        maintenanceBanner: updated.maintenanceBanner,
        maintenanceTitle: updated.maintenanceTitle,
        maintenanceMessage: updated.maintenanceMessage,
        maintenanceEstimatedEndTime: updated.maintenanceEstimatedEndTime,
      }));

      setShowMaintenanceModal(null);
      setNotice({
        type: 'success',
        message: targetState ? 'Maintenance mode enabled.' : 'Maintenance mode disabled.',
      });
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to toggle maintenance mode:', err);
      setNotice({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to update maintenance settings.',
      });
    } finally {
      setSavingMaintenance(false);
    }
  };

  const handleSaveMaintenanceDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMaintenance(true);
    try {
      const updated = await updateMaintenanceSettings({
        maintenanceMode: settings.maintenanceMode,
        maintenanceBanner: settings.maintenanceBanner,
        maintenanceTitle: settings.maintenanceTitle,
        maintenanceMessage: settings.maintenanceMessage,
        maintenanceEstimatedEndTime: settings.maintenanceEstimatedEndTime,
        allowAdminAccess: settings.allowAdminAccess,
      });

      setSettings((prev) => ({
        ...prev,
        maintenanceMode: updated.maintenanceMode,
        maintenanceBanner: updated.maintenanceBanner,
        maintenanceTitle: updated.maintenanceTitle,
        maintenanceMessage: updated.maintenanceMessage,
        maintenanceEstimatedEndTime: updated.maintenanceEstimatedEndTime,
        allowAdminAccess: updated.allowAdminAccess,
      }));

      setNotice({ type: 'success', message: 'Maintenance configuration saved successfully!' });
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to save maintenance details:', err);
      setNotice({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to save maintenance details.',
      });
    } finally {
      setSavingMaintenance(false);
    }
  };

  const handleInquiryStatus = async (id: string, status: string) => {
    try {
      const updated = await updateInquiryStatus(id, status);
      setInquiries((prev) => prev.map((inq) => (inq._id === id ? { ...inq, status: updated.status } : inq)));
      setNotice({ type: 'success', message: `Inquiry status updated to ${status}` });
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      console.error('Failed to update inquiry:', err);
      setNotice({ type: 'error', message: 'Failed to update inquiry status.' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setNotice({ type: 'error', message: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 12) {
      setNotice({ type: 'error', message: 'New password must be at least 12 characters long.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setNotice({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await adminChangePassword(currentPassword, newPassword, confirmNewPassword);
      setNotice({ type: 'success', message: res.message || 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      // Refresh sessions
      const sessions = await fetchAdminSessions();
      setAdminSessions(sessions || []);
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to change admin password:', err);
      setNotice({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to change password.',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setRevokingSessions(true);
    try {
      const res = await revokeOtherAdminSessions();
      setNotice({ type: 'success', message: res.message || 'Other sessions revoked.' });
      const sessions = await fetchAdminSessions();
      setAdminSessions(sessions || []);
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to revoke other sessions:', err);
      setNotice({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to revoke other sessions.',
      });
    } finally {
      setRevokingSessions(false);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {notice && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Platform Configuration & System Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure platform branding, maintenance mode, matchmaking rules, customer support contact details, and audit history
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E51F3E]' : ''}`} />
          <span>Sync Settings</span>
        </button>
      </div>

      {/* ── Section 1: Maintenance Mode & Platform Status ── */}
      <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Maintenance Mode & Platform Availability</h3>
              <p className="text-xs text-slate-500">
                Control public site availability, full maintenance screens, and announcement banners
              </p>
            </div>
          </div>

          {/* Current Live State Badge */}
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
              settings.maintenanceMode
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                settings.maintenanceMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span>{settings.maintenanceMode ? '● Maintenance Mode Active' : '● Platform Online & Active'}</span>
          </div>
        </div>

        {/* Maintenance Mode Toggle Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Box 1: Full Maintenance Mode Toggle */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              settings.maintenanceMode
                ? 'bg-amber-50/60 border-amber-200 ring-2 ring-amber-400/20'
                : 'bg-slate-50/70 border-slate-200/90'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">Full Maintenance Mode</span>
                  {settings.maintenanceMode && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-extrabold uppercase">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  When enabled, all public visitors and members see the full-screen maintenance page. Administrators retain access to this Admin Panel.
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => handleToggleMaintenanceMode(!settings.maintenanceMode)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/40 ${
                  settings.maintenanceMode ? 'bg-amber-500' : 'bg-slate-300'
                }`}
                role="switch"
                aria-checked={settings.maintenanceMode}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Box 2: Maintenance Banner Toggle */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              settings.maintenanceBanner
                ? 'bg-rose-50/60 border-rose-200 ring-2 ring-rose-400/20'
                : 'bg-slate-50/70 border-slate-200/90'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">Show Platform Maintenance Banner</span>
                  {settings.maintenanceBanner && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-200 text-rose-900 text-[10px] font-extrabold uppercase">
                      SHOWN
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Display a top warning banner across the public website notifying users of upcoming or in-progress maintenance without blocking navigation.
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, maintenanceBanner: !settings.maintenanceBanner })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/40 ${
                  settings.maintenanceBanner ? 'bg-[#E51F3E]' : 'bg-slate-300'
                }`}
                role="switch"
                aria-checked={settings.maintenanceBanner}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.maintenanceBanner ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Maintenance Message & Timing Form */}
        <form onSubmit={handleSaveMaintenanceDetails} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Maintenance Page Title</label>
              <input
                type="text"
                value={settings.maintenanceTitle}
                onChange={(e) => setSettings({ ...settings, maintenanceTitle: e.target.value })}
                placeholder="We'll Be Back Soon"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Estimated Completion Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={
                  settings.maintenanceEstimatedEndTime
                    ? new Date(settings.maintenanceEstimatedEndTime).toISOString().slice(0, 16)
                    : ''
                }
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maintenanceEstimatedEndTime: e.target.value ? e.target.value : null,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1.5">
                Maintenance Notice Message
              </label>
              <textarea
                rows={2}
                value={settings.maintenanceMessage}
                onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                placeholder="Wonderful Jodi is currently undergoing scheduled maintenance. Please check back shortly."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingMaintenance}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingMaintenance ? 'Saving...' : 'Update Maintenance Details'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* ── Section 2: General Platform Settings Form ── */}
      <form onSubmit={handleSaveSettings} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-8">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-[#E51F3E] flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">General Matrimony Platform Settings</h3>
            <p className="text-xs text-slate-500">Live operational switches and contact endpoints</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Platform Brand Name</label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Official Support Email</label>
            <input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Support Mobile / Helpline</label>
            <input
              type="text"
              value={settings.supportPhone}
              onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Toll Free Helpline</label>
            <input
              type="text"
              value={settings.tollFreeNumber}
              onChange={(e) => setSettings({ ...settings, tollFreeNumber: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Default Currency</label>
            <input
              type="text"
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Max Photo Uploads</label>
            <input
              type="number"
              value={settings.maxPhotoUploadLimit}
              onChange={(e) => setSettings({ ...settings, maxPhotoUploadLimit: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <label className="block font-bold text-slate-700 mb-1.5">Registered Office Address</label>
            <input
              type="text"
              value={settings.officeAddress}
              onChange={(e) => setSettings({ ...settings, officeAddress: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>
        </div>

        {/* Feature Switches */}
        <div className="pt-6 border-t border-slate-100">
          <h4 className="font-bold text-slate-900 text-sm mb-4">Operational Feature Toggles</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-xs">Allow User Registrations</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Enable new signups on public site</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowNewRegistrations}
                onChange={(e) => setSettings({ ...settings, allowNewRegistrations: e.target.checked })}
                className="w-5 h-5 text-[#E51F3E] rounded-md focus:ring-red-500"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-xs">Manual Profile KYC Approval</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Require admin check before publishing</p>
              </div>
              <input
                type="checkbox"
                checked={settings.requireManualProfileApproval}
                onChange={(e) => setSettings({ ...settings, requireManualProfileApproval: e.target.checked })}
                className="w-5 h-5 text-[#E51F3E] rounded-md focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E51F3E] via-[#E82645] to-[#F03554] hover:from-[#d11735] hover:to-[#e0203f] text-white font-bold text-xs shadow-md shadow-red-600/20 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Platform Settings'}</span>
          </button>
        </div>
      </form>

      {/* ── Section 3: Administrator Security, Password & Active Sessions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Box A: Change Master Password */}
        <form onSubmit={handleChangePassword} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-[#E51F3E] flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Change Administrator Password</h3>
                <p className="text-xs text-slate-500">Update master admin credentials with verified password rotation</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">New Password (Min 12 Chars)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{changingPassword ? 'Updating Password...' : 'Update Admin Password'}</span>
            </button>
          </div>
        </form>

        {/* Box B: Active Sessions */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Active Administrator Sessions</h3>
                  <p className="text-xs text-slate-500">Authorized devices and tokens signed into this admin account</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-600">{adminSessions.length} Active</span>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {adminSessions.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No active sessions tracked.</p>
              ) : (
                adminSessions.map((sess) => (
                  <div
                    key={sess._id}
                    className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                      sess.isCurrent
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-slate-50 border-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5 max-w-[240px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{sess.userAgent.slice(0, 40)}</span>
                        {sess.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        IP: {sess.ipAddress} • Logged in: {new Date(sess.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleRevokeOtherSessions}
              disabled={revokingSessions || adminSessions.length <= 1}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs shadow-xs transition disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{revokingSessions ? 'Revoking...' : 'Sign Out Other Sessions'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Inquiries / CRM Queue */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <MailQuestion className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Customer & Concierge Inquiries</h3>
              <p className="text-xs text-slate-500">Contact form leads, VIP assistance requests, and parent inquiries</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-600">{inquiries.length} Inquiries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Lead / Inquirer</th>
                <th className="py-3.5 px-5">Contact Details</th>
                <th className="py-3.5 px-5">Message & Inquiry Details</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inquiries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No customer contact inquiries logged.
                  </td>
                </tr>
              ) : (
                inquiries.map((inq) => (
                  <tr key={inq._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900">{inq.name}</td>
                    <td className="py-3.5 px-5">
                      <p className="text-slate-700 font-medium">{inq.email}</p>
                      <p className="text-[11px] text-slate-500">{inq.mobile}</p>
                    </td>
                    <td className="py-3.5 px-5 max-w-sm text-slate-700 leading-relaxed">
                      {inq.message}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inq.status === 'NEW'
                            ? 'bg-amber-100 text-amber-800'
                            : inq.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {inq.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <select
                        value={inq.status}
                        onChange={(e) => handleInquiryStatus(inq._id, e.target.value)}
                        className="text-[11px] font-bold rounded-lg px-2 py-1 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none"
                      >
                        <option value="NEW">NEW</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Security & Audit Activity Trail</h3>
              <p className="text-xs text-slate-500">Immutable ledger of administrative actions, verifications, and updates</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-600">{auditLogs.length} Audit Entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Admin Email</th>
                <th className="py-3.5 px-5">Action Performed</th>
                <th className="py-3.5 px-5">Target Entity</th>
                <th className="py-3.5 px-5">Details</th>
                <th className="py-3.5 px-5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900">{log.adminEmail}</td>
                    <td className="py-3.5 px-5 font-mono text-[11px] font-bold text-purple-700">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">
                      {log.targetModel ? `${log.targetModel} (${log.targetId ? log.targetId.slice(-6) : ''})` : '—'}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 max-w-sm truncate">{log.details || '—'}</td>
                    <td className="py-3.5 px-5 text-slate-400">
                      {new Date(log.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
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

      {/* ── Maintenance Mode Confirmation Modal ── */}
      {showMaintenanceModal !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-4 animate-fade-in">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                showMaintenanceModal
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <Wrench className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {showMaintenanceModal ? 'Enable Maintenance Mode?' : 'Disable Maintenance Mode?'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                {showMaintenanceModal
                  ? 'Visitors will temporarily be unable to access the platform. Administrators will still be able to access the Admin Panel.'
                  : 'The platform will be restored to active public service and visitors will regain normal access.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMaintenanceToggle}
                disabled={savingMaintenance}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition disabled:opacity-60 ${
                  showMaintenanceModal
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {savingMaintenance
                  ? 'Saving...'
                  : showMaintenanceModal
                  ? 'Enable Maintenance Mode'
                  : 'Disable Maintenance Mode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
