import api from '../lib/api';

export async function verifySuperAdminAccessApi() {
  const res = await api.get('/admin/super/auth/verify');
  return res.data;
}

export async function fetchMonetizationSummary() {
  const res = await api.get('/admin/super/monetization/summary');
  return res.data;
}

export async function fetchSuperAdminPlans() {
  const res = await api.get('/admin/super/monetization/plans');
  return res.data;
}

export async function updateSuperAdminPlan(id: string, data: any) {
  const res = await api.patch(`/admin/super/monetization/plans/${id}`, data);
  return res.data;
}

export async function fetchSafetySummary() {
  const res = await api.get('/admin/super/safety/summary');
  return res.data;
}

export async function fetchContactRequestsOversight(params?: { page?: number; limit?: number; status?: string }) {
  const res = await api.get('/admin/super/safety/contact-requests', { params });
  return res.data;
}

export async function fetchBlocksList(params?: { page?: number; limit?: number }) {
  const res = await api.get('/admin/super/safety/blocks', { params });
  return res.data;
}

export async function fetchModerationQueue(params?: { page?: number; limit?: number; status?: string }) {
  const res = await api.get('/admin/super/safety/moderation', { params });
  return res.data;
}

export async function fetchSecuritySummary() {
  const res = await api.get('/admin/super/security/summary');
  return res.data;
}

export async function fetchAdminUsers() {
  const res = await api.get('/admin/super/security/admins');
  return res.data;
}

export async function updateAdminPermissions(id: string, permissions: string[]) {
  const res = await api.patch(`/admin/super/security/admins/${id}/permissions`, { permissions });
  return res.data;
}

export async function fetchAuditLogs(params?: { page?: number; limit?: number; action?: string }) {
  const res = await api.get('/admin/super/security/audit-logs', { params });
  return res.data;
}

export async function fetchSupportInquiries(params?: { page?: number; limit?: number; status?: string }) {
  const res = await api.get('/admin/super/support/inquiries', { params });
  return res.data;
}

export async function fetchSupportInquiryDetails(id: string) {
  const res = await api.get(`/admin/super/support/inquiries/${id}`);
  return res.data;
}

export async function addSupportInquiryNote(id: string, note: string) {
  const res = await api.post(`/admin/super/support/inquiries/${id}/notes`, { note });
  return res.data;
}

export async function replySupportInquiry(id: string, payload: { replyText: string; newStatus?: string; idempotencyKey?: string }) {
  const res = await api.post(`/admin/super/support/inquiries/${id}/reply`, payload);
  return res.data;
}

export async function retrySupportInquiryEmail(id: string, payload?: { replyId?: string; reconcileAction?: string }) {
  const res = await api.post(`/admin/super/support/inquiries/${id}/retry-email`);
  return res.data;
}
