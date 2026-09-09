import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { submitReport } from '../controllers/reportController';

const router = Router();

// Authenticated users can submit reports against inappropriate accounts / messages
router.post('/', requireAuth, submitReport);

export default router;
