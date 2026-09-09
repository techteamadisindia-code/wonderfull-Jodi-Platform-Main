import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  getDashboardStats,
  getDailyVisitsAnalytics,
  getDashboardVerifications,
  getDashboardTransactions,
  getDashboardRecentUsers,
  getDashboardInquiries,
  getDashboardReports,
  getDashboardRevenue,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getProfiles,
  getProfileById,
  updateProfile,
  getVerifications,
  getVerificationById,
  approveVerification,
  rejectVerification,
  getMemberships,
  updateMembership,
  getPayments,
  getInterests,
  updateInterestStatus,
  getShortlists,
  deleteShortlist,
  getMessages,
  getConversationMessages,
  updateConversationStatus,
  updateMessageModeration,
  simulateCompliance,
  sendDemoSeedMessage,
  resetDemoTestMessages,
  getMessageStats,
  getReports,
  getReportById,
  resolveReport,
  dismissReport,
  blockUserFromReport,
  getNotifications,
  getBroadcastById,
  getRecipientCount,
  searchAdminUsers,
  sendNotification,
  deleteBroadcast,
  getAdmins,
  createAdmin,
  updateAdmin,
  getSettings,
  updateSettings,
  getMaintenanceSettings,
  updateMaintenanceSettings,
  getInquiries,
  updateInquiryStatus,
  getAuditLogs,
} from '../controllers/adminController';

const router = Router();

// All admin routes require valid JWT & 'admin' role
router.use(requireAuth, requireRole('admin'));

// 1. Dashboard & Analytics
router.get('/dashboard', getDashboardStats);
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/daily-visits', getDailyVisitsAnalytics);
router.get('/analytics/daily-visits', getDailyVisitsAnalytics);
router.get('/dashboard/verifications', getDashboardVerifications);
router.get('/dashboard/transactions', getDashboardTransactions);
router.get('/dashboard/recent-users', getDashboardRecentUsers);
router.get('/dashboard/inquiries', getDashboardInquiries);
router.get('/dashboard/reports', getDashboardReports);
router.get('/dashboard/revenue', getDashboardRevenue);

// 1c. Incomplete Registrations & Unregistered Candidates
import {
  getIncompleteRegistrationsCount,
  getAdminRegistrationStats,
  getAdminRegistrations,
  getAdminRegistrationById,
} from '../controllers/registrationController';

router.get('/registrations/incomplete/count', getIncompleteRegistrationsCount);
router.get('/registrations/stats', getAdminRegistrationStats);
router.get('/registrations', getAdminRegistrations);
router.get('/registrations/:id', getAdminRegistrationById);

// 2. Users
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// 3. Profiles
router.get('/profiles', getProfiles);
router.get('/profiles/:id', getProfileById);
router.put('/profiles/:id', updateProfile);

// 4. Verifications
router.get('/verifications', getVerifications);
router.get('/verifications/:id', getVerificationById);
router.put('/verifications/:id/approve', approveVerification);
router.post('/verifications/:id/approve', approveVerification);
router.put('/verifications/:id/reject', rejectVerification);
router.post('/verifications/:id/reject', rejectVerification);

// 5. Memberships / Subscriptions
router.get('/memberships', getMemberships);
router.put('/memberships/:id', updateMembership);

// 6. Payments
import {
  getAdminPayments,
  getAdminPaymentStats,
  getAdminPaymentById,
  refundPayment,
  simulateDevPayment,
} from '../controllers/paymentController';

router.get('/payments', getAdminPayments);
router.get('/payments/stats', getAdminPaymentStats);
router.get('/payments/:id', getAdminPaymentById);
router.post('/payments/:id/refund', refundPayment);
router.post('/payments/simulate', simulateDevPayment);

// 7. Activity: Interests, Shortlists, Messages
router.get('/interests', getInterests);
router.put('/interests/:id/status', updateInterestStatus);
router.patch('/interests/:id/status', updateInterestStatus);
router.patch('/interests/:id', updateInterestStatus);
router.get('/shortlists', getShortlists);
router.delete('/shortlists/:id', deleteShortlist);

// Messages & Conversations Monitor
router.get('/messages', getMessages);
router.get('/messages/stats', getMessageStats);
router.get('/messages/conversations', getMessages);
router.get('/messages/conversations/:id/messages', getConversationMessages);
router.get('/messages/:id/messages', getConversationMessages);
router.put('/messages/conversations/:id/status', updateConversationStatus);
router.put('/messages/conversations/:id/compliance', updateConversationStatus);
router.patch('/messages/conversations/:id', updateConversationStatus);
router.put('/messages/messages/:id/moderation', updateMessageModeration);
router.put('/messages/:id/moderation', updateMessageModeration);
router.post('/messages/simulate', simulateCompliance);
router.post('/messages/demo-seed-message', sendDemoSeedMessage);
router.post('/messages/reset-demo', resetDemoTestMessages);

// 8. Safety & Reports
router.get('/reports', getReports);
router.get('/reports/:id', getReportById);
router.put('/reports/:id/resolve', resolveReport);
router.patch('/reports/:id/resolve', resolveReport);
router.put('/reports/:id/dismiss', dismissReport);
router.patch('/reports/:id/dismiss', dismissReport);
router.post('/reports/:id/block-user', blockUserFromReport);

// 9. Broadcast Notifications
router.get('/notifications', getNotifications);
router.post('/notifications', sendNotification);
router.post('/notifications/recipient-count', getRecipientCount);
router.get('/notifications/search-users', searchAdminUsers);
router.get('/notifications/:id', getBroadcastById);
router.delete('/notifications/:id', deleteBroadcast);

// 10. Admin Accounts
router.get('/admins', getAdmins);
router.post('/admins', createAdmin);
router.put('/admins/:id', updateAdmin);

// 11. Platform Settings & Maintenance Mode
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/settings/maintenance', getMaintenanceSettings);
router.put('/settings/maintenance', updateMaintenanceSettings);

// 12. Inquiries
router.get('/inquiries', getInquiries);
router.put('/inquiries/:id/status', updateInquiryStatus);

// 13. Audit Trail
router.get('/audit-logs', getAuditLogs);

export default router;
