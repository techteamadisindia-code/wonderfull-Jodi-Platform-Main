import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  getMasterDataSummary,
  getMasterDataItems,
  createMasterDataItem,
  updateMasterDataItem,
  deleteMasterDataItem,
  handleBulkImport,
} from '../controllers/adminMasterDataController';

const router = Router();

// Apply admin authentication to all master-data routes
router.use(requireAuth, requireRole('admin'));

router.get('/summary', getMasterDataSummary);
router.get('/items', getMasterDataItems);
router.post('/items', createMasterDataItem);
router.put('/items/:id', updateMasterDataItem);
router.delete('/items/:id', deleteMasterDataItem);
router.post('/import', handleBulkImport);

export default router;
