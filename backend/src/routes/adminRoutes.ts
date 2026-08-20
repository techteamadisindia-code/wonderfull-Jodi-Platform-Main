import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  getDashboardStats,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getProfiles,
  getProfileById,
  updateProfile,
  getVerifications,
  approveVerification,
  rejectVerification,
  getMemberships,
  updateMembership,
  getPayments,
  getInterests,
  getShortlists,
  getMessages,
  getReports,
  resolveReport,
  dismissReport,
  getNotifications,
  sendNotification,
  getAdmins,
  createAdmin,
  updateAdmin,
  getSettings,
  updateSettings,
  getInquiries,
  updateInquiryStatus,
  getAuditLogs,
} from '../controllers/adminController';

const router = Router();

// All admin routes require valid JWT & 'admin' role
router.use(requireAuth, requireRole('admin'));

// 1. Dashboard
router.get('/dashboard', getDashboardStats);

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
router.put('/verifications/:id/approve', approveVerification);
router.put('/verifications/:id/reject', rejectVerification);

// 5. Memberships / Subscriptions
router.get('/memberships', getMemberships);
router.put('/memberships/:id', updateMembership);

// 6. Payments
router.get('/payments', getPayments);

// 7. Activity: Interests, Shortlists, Messages
router.get('/interests', getInterests);
router.get('/shortlists', getShortlists);
router.get('/messages', getMessages);

// 8. Safety & Reports
router.get('/reports', getReports);
router.put('/reports/:id/resolve', resolveReport);
router.put('/reports/:id/dismiss', dismissReport);

// 9. Broadcast Notifications
router.get('/notifications', getNotifications);
router.post('/notifications', sendNotification);

// 10. Admin Accounts
router.get('/admins', getAdmins);
router.post('/admins', createAdmin);
router.put('/admins/:id', updateAdmin);

// 11. Platform Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// 12. Inquiries
router.get('/inquiries', getInquiries);
router.put('/inquiries/:id/status', updateInquiryStatus);

// 13. Audit Trail
router.get('/audit-logs', getAuditLogs);

export default router;
