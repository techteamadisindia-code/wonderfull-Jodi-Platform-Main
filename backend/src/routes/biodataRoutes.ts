import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  getProfileForBiodata,
  listBiodatas,
  createBiodata,
  getBiodataById,
  updateBiodata,
  deleteBiodata,
  generateBiodataPdf,
  downloadBiodataPdf,
  getPublicBiodata,
  getAdminBiodataStats,
} from '../controllers/biodataController';

const router = Router();

// Public View Route (Unauthenticated for WhatsApp/Public sharing)
router.get('/public/:publicId', getPublicBiodata);

// Authenticated Routes
router.get('/profile', requireAuth, getProfileForBiodata);
router.get('/admin/stats', requireAuth, requireRole('admin'), getAdminBiodataStats);

router.get('/', requireAuth, listBiodatas);
router.post('/', requireAuth, createBiodata);

router.get('/:id', requireAuth, getBiodataById);
router.put('/:id', requireAuth, updateBiodata);
router.patch('/:id', requireAuth, updateBiodata);
router.delete('/:id', requireAuth, deleteBiodata);

// PDF Generation & Download
router.post('/:id/generate-pdf', requireAuth, generateBiodataPdf);
router.get('/:id/pdf', requireAuth, downloadBiodataPdf);

export default router;
