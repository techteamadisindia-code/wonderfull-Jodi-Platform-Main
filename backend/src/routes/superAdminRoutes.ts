import { Router } from 'express';
import { requireAuth, requireSuperAdmin } from '../middleware/authMiddleware';
import {
  verifySuperAdminAccess,
  getMonetizationSummary,
  getMembershipPlans,
  updateMembershipPlan,
  getSafetySummary,
  getContactRequestsOversight,
  getBlocksList,
  getModerationQueue,
  getSecuritySummary,
  getAdminUsers,
  updateAdminPermissions,
  getAuditLogs,
  getSupportInquiries,
  getSupportInquiryDetails,
  addInquiryNote,
  replyToSupportInquiry,
  retrySupportInquiryEmail,
} from '../controllers/superAdminController';

const router = Router();

// Strictly enforce Super Administrator privileges for ALL routes on this router.
// Fails closed if token is invalid, role !== 'admin', or admin permissions do not include 'all'.
router.use(requireAuth, requireSuperAdmin);

// 0. Dedicated Authoritative Super Admin Authorization Verification Endpoint
router.get('/auth/verify', verifySuperAdminAccess);

// 1. Monetization & Promotion
router.get('/monetization/summary', getMonetizationSummary);
router.get('/monetization/plans', getMembershipPlans);
router.patch('/monetization/plans/:id', updateMembershipPlan);
router.put('/monetization/plans/:id', updateMembershipPlan);

// 2. Engagement & Safety
router.get('/safety/summary', getSafetySummary);
router.get('/safety/contact-requests', getContactRequestsOversight);
router.get('/safety/blocks', getBlocksList);
router.get('/safety/moderation', getModerationQueue);

// 3. Security & System Operations
router.get('/security/summary', getSecuritySummary);
router.get('/security/admins', getAdminUsers);
router.patch('/security/admins/:id/permissions', updateAdminPermissions);
router.get('/security/audit-logs', getAuditLogs);

// 4. Support Notes & Email Inquiries
router.get('/support/inquiries', getSupportInquiries);
router.get('/support/inquiries/:id', getSupportInquiryDetails);
router.post('/support/inquiries/:id/notes', addInquiryNote);
router.post('/support/inquiries/:id/reply', replyToSupportInquiry);
router.post('/support/inquiries/:id/retry-email', retrySupportInquiryEmail);

export default router;
