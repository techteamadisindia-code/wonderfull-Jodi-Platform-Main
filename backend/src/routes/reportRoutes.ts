import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { submitReport, getMyReports } from '../controllers/reportController';

const router = Router();

// Authenticated users can submit reports against inappropriate accounts / messages
router.post('/', requireAuth, submitReport);
router.get('/my-reports', requireAuth, getMyReports);

export default router;

