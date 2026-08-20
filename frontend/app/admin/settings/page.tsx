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
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import {
  fetchPlatformSettings,
  updatePlatformSettings,
  fetchInquiries,
  updateInquiryStatus,
  fetchAuditLogs,
  PlatformSettings,
  ContactInquiryItem,
  AuditLogItem
} from '../../../services/adminApi';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({
    siteName: 'Wonderful Jodi',
    supportEmail: 'support@wonderfuljodi.com',
    supportPhone: '+91 98765 43210',
    tollFreeNumber: '+91 1800 200 9090',
    officeAddress: 'Cyber City, Phase II, Gurugram, Haryana - 122002',
    maintenanceMode: false,
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsData, inquiriesData, logsData] = await Promise.all([
        fetchPlatformSettings().catch(() => null),
        fetchInquiries().catch(() => []),
        fetchAuditLogs().catch(() => []),
      ]);

      if (settingsData) setSettings(settingsData);
      setInquiries(inquiriesData || []);
      setAuditLogs(logsData || []);
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
      setNotice('Platform configuration settings saved successfully!');
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleInquiryStatus = async (id: string, status: string) => {
    try {
      const updated = await updateInquiryStatus(id, status);
      setInquiries((prev) => prev.map((inq) => (inq._id === id ? { ...inq, status: updated.status } : inq)));
      setNotice(`Inquiry status updated to ${status}`);
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      console.error('Failed to update inquiry:', err);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-900">
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
            Configure platform branding, matchmaking rules, customer support contact details, and audit history
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Sync Settings</span>
        </button>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-8">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
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
            <label className="block font-bold text-slate-700 mb-1.5">Support Mobile / WhatsApp</label>
            <input
              type="text"
              value={settings.supportPhone}
              onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Toll Free Helpdesk</label>
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
                className="w-5 h-5 text-red-600 rounded-md focus:ring-red-500"
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
                className="w-5 h-5 text-red-600 rounded-md focus:ring-red-500"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-xs">Maintenance Mode</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Show platform maintenance banner</p>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="w-5 h-5 text-red-600 rounded-md focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Platform Settings'}</span>
          </button>
        </div>
      </form>

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
    </div>
  );
}
