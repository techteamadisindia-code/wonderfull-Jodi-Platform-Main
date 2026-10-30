"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const superAdminController_1 = require("../controllers/superAdminController");
const router = (0, express_1.Router)();
// Strictly enforce Super Administrator privileges for ALL routes on this router.
// Fails closed if token is invalid, role !== 'admin', or admin permissions do not include 'all'.
router.use(authMiddleware_1.requireAuth, authMiddleware_1.requireSuperAdmin);
// 0. Dedicated Authoritative Super Admin Authorization Verification Endpoint
router.get('/auth/verify', superAdminController_1.verifySuperAdminAccess);
// 1. Monetization & Promotion
router.get('/monetization/summary', superAdminController_1.getMonetizationSummary);
router.get('/monetization/plans', superAdminController_1.getMembershipPlans);
router.patch('/monetization/plans/:id', superAdminController_1.updateMembershipPlan);
router.put('/monetization/plans/:id', superAdminController_1.updateMembershipPlan);
// 2. Engagement & Safety
router.get('/safety/summary', superAdminController_1.getSafetySummary);
router.get('/safety/contact-requests', superAdminController_1.getContactRequestsOversight);
router.get('/safety/blocks', superAdminController_1.getBlocksList);
router.get('/safety/moderation', superAdminController_1.getModerationQueue);
// 3. Security & System Operations
router.get('/security/summary', superAdminController_1.getSecuritySummary);
router.get('/security/admins', superAdminController_1.getAdminUsers);
router.patch('/security/admins/:id/permissions', superAdminController_1.updateAdminPermissions);
router.get('/security/audit-logs', superAdminController_1.getAuditLogs);
// 4. Support Notes & Email Inquiries
router.get('/support/inquiries', superAdminController_1.getSupportInquiries);
router.get('/support/inquiries/:id', superAdminController_1.getSupportInquiryDetails);
router.post('/support/inquiries/:id/notes', superAdminController_1.addInquiryNote);
router.post('/support/inquiries/:id/reply', superAdminController_1.replyToSupportInquiry);
router.post('/support/inquiries/:id/retry-email', superAdminController_1.retrySupportInquiryEmail);
exports.default = router;
//# sourceMappingURL=superAdminRoutes.js.map