import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { getDashboardStats, getUsers, updateUserStatus, getPendingVerifications, resolveReport } from '../controllers/adminController';

const router = Router();

router.use(requireAuth, requireRole('admin'));
router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.get('/verifications', getPendingVerifications);
router.put('/reports/:id/resolve', resolveReport);

export default router;
