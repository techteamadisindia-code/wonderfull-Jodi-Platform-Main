import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  getMasterDataSummary,
  getMasterDataItems,
  createMasterDataItem,
  updateMasterDataItem,
  deleteMasterDataItem,
  handleBulkImport,
  uploadLocationPdf,
  confirmLocationImport,
  getImportHistory,
  downloadImportErrorReport,
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

// Location PDF Upload & Import Workflows
router.post('/upload-pdf', uploadLocationPdf);
router.post('/import/confirm', confirmLocationImport);
router.get('/import-history', getImportHistory);
router.get('/import-history/:id/error-report', downloadImportErrorReport);

export default router;
