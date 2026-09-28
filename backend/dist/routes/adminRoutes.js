"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminController_1 = require("../controllers/adminController");
const membershipPlanAdminController_1 = require("../controllers/membershipPlanAdminController");
const router = (0, express_1.Router)();
// All admin routes require valid JWT & 'admin' role
router.use(authMiddleware_1.requireAuth, (0, authMiddleware_1.requireRole)('admin'));
// 1. Dashboard & Analytics
router.get('/dashboard', adminController_1.getDashboardStats);
router.get('/dashboard/stats', adminController_1.getDashboardStats);
router.get('/dashboard/daily-visits', adminController_1.getDailyVisitsAnalytics);
router.get('/analytics/daily-visits', adminController_1.getDailyVisitsAnalytics);
router.get('/dashboard/verifications', adminController_1.getDashboardVerifications);
router.get('/dashboard/transactions', adminController_1.getDashboardTransactions);
router.get('/dashboard/recent-users', adminController_1.getDashboardRecentUsers);
router.get('/dashboard/inquiries', adminController_1.getDashboardInquiries);
router.get('/dashboard/reports', adminController_1.getDashboardReports);
router.get('/dashboard/revenue', adminController_1.getDashboardRevenue);
// 1c. Incomplete Registrations & Unregistered Candidates
const registrationController_1 = require("../controllers/registrationController");
router.get('/registrations/incomplete/count', registrationController_1.getIncompleteRegistrationsCount);
router.get('/registrations/stats', registrationController_1.getAdminRegistrationStats);
router.get('/registrations', registrationController_1.getAdminRegistrations);
router.get('/registrations/:id', registrationController_1.getAdminRegistrationById);
// 2. Users
router.get('/users', adminController_1.getUsers);
router.get('/users/:id', adminController_1.getUserById);
router.put('/users/:id/status', adminController_1.updateUserStatus);
router.put('/users/:id/role', adminController_1.updateUserRole);
router.delete('/users/:id', adminController_1.deleteUser);
// 3. Profiles
router.get('/profiles', adminController_1.getProfiles);
router.get('/profiles/:id', adminController_1.getProfileById);
router.put('/profiles/:id', adminController_1.updateProfile);
router.patch('/profiles/:id', adminController_1.updateProfile);
router.post('/profiles/:id/notes', adminController_1.addProfileAdminNote);
// 4. Verifications
router.get('/verifications', adminController_1.getVerifications);
router.get('/verifications/:id', adminController_1.getVerificationById);
router.put('/verifications/:id/approve', adminController_1.approveVerification);
router.post('/verifications/:id/approve', adminController_1.approveVerification);
router.put('/verifications/:id/reject', adminController_1.rejectVerification);
router.post('/verifications/:id/reject', adminController_1.rejectVerification);
router.put('/verifications/user/:userId/approve-all', adminController_1.approveAllUserVerifications);
router.put('/verifications/user/:userId/reject-all', adminController_1.rejectAllUserVerifications);
// 5. Dynamic Membership Plan Management
router.get('/memberships', (req, res, next) => {
    if (req.query.type === 'subscriptions') {
        return (0, adminController_1.getMemberships)(req, res, next);
    }
    return (0, membershipPlanAdminController_1.getAllPlans)(req, res, next);
});
router.post('/memberships', membershipPlanAdminController_1.createPlan);
router.get('/memberships/:id', membershipPlanAdminController_1.getPlanById);
router.put('/memberships/:id', (req, res, next) => {
    if (req.query.type === 'subscriptions') {
        return (0, adminController_1.updateMembership)(req, res, next);
    }
    return (0, membershipPlanAdminController_1.updatePlan)(req, res, next);
});
router.delete('/memberships/:id', membershipPlanAdminController_1.deletePlan);
router.patch('/memberships/:id/status', membershipPlanAdminController_1.togglePlanStatus);
// User Subscriptions dedicated routes
router.get('/subscriptions', adminController_1.getMemberships);
router.put('/subscriptions/:id', adminController_1.updateMembership);
// 6. Payments
const paymentController_1 = require("../controllers/paymentController");
router.get('/payments', paymentController_1.getAdminPayments);
router.get('/payments/stats', paymentController_1.getAdminPaymentStats);
router.get('/payments/:id', paymentController_1.getAdminPaymentById);
router.post('/payments/:id/refund', paymentController_1.refundPayment);
router.post('/payments/simulate', paymentController_1.simulateDevPayment);
// 7. Activity: Interests, Shortlists, Messages
router.get('/interests', adminController_1.getInterests);
router.put('/interests/:id/status', adminController_1.updateInterestStatus);
router.patch('/interests/:id/status', adminController_1.updateInterestStatus);
router.patch('/interests/:id', adminController_1.updateInterestStatus);
router.get('/shortlists', adminController_1.getShortlists);
router.delete('/shortlists/:id', adminController_1.deleteShortlist);
// Messages & Conversations Monitor
router.get('/messages', adminController_1.getMessages);
router.get('/messages/stats', adminController_1.getMessageStats);
router.get('/messages/conversations', adminController_1.getMessages);
router.get('/messages/conversations/:id/messages', adminController_1.getConversationMessages);
router.get('/messages/:id/messages', adminController_1.getConversationMessages);
router.put('/messages/conversations/:id/status', adminController_1.updateConversationStatus);
router.put('/messages/conversations/:id/compliance', adminController_1.updateConversationStatus);
router.patch('/messages/conversations/:id', adminController_1.updateConversationStatus);
router.put('/messages/messages/:id/moderation', adminController_1.updateMessageModeration);
router.put('/messages/:id/moderation', adminController_1.updateMessageModeration);
router.post('/messages/simulate', adminController_1.simulateCompliance);
router.post('/messages/demo-seed-message', adminController_1.sendDemoSeedMessage);
router.post('/messages/reset-demo', adminController_1.resetDemoTestMessages);
// 8. Safety & Reports
router.get('/reports', adminController_1.getReports);
router.get('/reports/:id', adminController_1.getReportById);
router.get('/reports/profile/:profileId', adminController_1.getReportsByProfile);
router.patch('/reports/:id/status', adminController_1.updateReportStatus);
router.put('/reports/:id/resolve', adminController_1.resolveReport);
router.post('/reports/:id/resolve', adminController_1.resolveReport);
router.patch('/reports/:id/resolve', adminController_1.resolveReport);
router.put('/reports/:id/dismiss', adminController_1.dismissReport);
router.post('/reports/:id/dismiss', adminController_1.dismissReport);
router.patch('/reports/:id/dismiss', adminController_1.dismissReport);
router.post('/reports/:id/block-user', adminController_1.blockUserFromReport);
// Profile Safety & Moderation Actions
router.patch('/profiles/:id/status', adminController_1.updateProfileSafetyStatus);
router.post('/profiles/:id/warning', adminController_1.sendProfileWarning);
router.post('/profiles/:id/suspend', adminController_1.suspendProfile);
router.post('/profiles/:id/block', adminController_1.blockProfileAdmin);
router.delete('/profiles/:id', adminController_1.deleteProfileAdmin);
// Safety Stats & Audit History
router.get('/safety/stats', adminController_1.getSafetyStats);
router.get('/safety/audit-logs', adminController_1.getSafetyAuditLogs);
router.get('/safety/audit-logs/:profileId', adminController_1.getSafetyAuditLogs);
// 9. Broadcast Notifications
router.get('/notifications', adminController_1.getNotifications);
router.post('/notifications', adminController_1.sendNotification);
router.post('/notifications/recipient-count', adminController_1.getRecipientCount);
router.get('/notifications/search-users', adminController_1.searchAdminUsers);
router.get('/notifications/:id', adminController_1.getBroadcastById);
router.delete('/notifications/:id', adminController_1.deleteBroadcast);
// 10. Admin Accounts
router.get('/admins', adminController_1.getAdmins);
router.post('/admins', adminController_1.createAdmin);
router.put('/admins/:id', adminController_1.updateAdmin);
// 11. Platform Settings & Maintenance Mode
router.get('/settings', adminController_1.getSettings);
router.put('/settings', adminController_1.updateSettings);
router.get('/settings/maintenance', adminController_1.getMaintenanceSettings);
router.put('/settings/maintenance', adminController_1.updateMaintenanceSettings);
// 12. Inquiries
router.get('/inquiries', adminController_1.getInquiries);
router.put('/inquiries/:id/status', adminController_1.updateInquiryStatus);
// 13. Audit Trail
router.get('/audit-logs', adminController_1.getAuditLogs);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map