import { Router } from 'express';
import { requireAdminAuth } from '../middleware/authMiddleware';
import {
  getPublicAwards,
  getPublicAwardBySlug,
  getAdminAwards,
  getAdminAwardById,
  createAward,
  updateAward,
  deleteAward,
  updateAwardStatus,
  toggleAwardFeatured,
  updateAwardOrder,
  uploadAwardImage,
} from '../controllers/awardController';

// ─── PUBLIC AWARDS ROUTER ───
export const publicAwardRouter = Router();

// GET /api/awards - List active awards (optional ?featured=true)
publicAwardRouter.get('/', getPublicAwards);

// GET /api/awards/:slug - View single active award details
publicAwardRouter.get('/:slug', getPublicAwardBySlug);


// ─── ADMIN AWARDS ROUTER (Super Admin & Admin Only) ───
export const adminAwardRouter = Router();

// Enforce admin privileges
adminAwardRouter.use(requireAdminAuth);

// GET /api/admin/awards - List all awards with stats
adminAwardRouter.get('/', getAdminAwards);

// POST /api/admin/awards - Create new award
adminAwardRouter.post('/', createAward);

// POST /api/admin/awards/upload-image - Upload logo or gallery image
adminAwardRouter.post('/upload-image', uploadAwardImage);

// GET /api/admin/awards/:id - Single award details
adminAwardRouter.get('/:id', getAdminAwardById);

// PUT /api/admin/awards/:id - Update award
adminAwardRouter.put('/:id', updateAward);

// DELETE /api/admin/awards/:id - Soft delete award
adminAwardRouter.delete('/:id', deleteAward);

// PATCH /api/admin/awards/:id/status - Toggle active/inactive
adminAwardRouter.patch('/:id/status', updateAwardStatus);

// PATCH /api/admin/awards/:id/featured - Toggle homepage featured
adminAwardRouter.patch('/:id/featured', toggleAwardFeatured);

// PATCH /api/admin/awards/:id/order - Update display order
adminAwardRouter.patch('/:id/order', updateAwardOrder);

export default {
  publicAwardRouter,
  adminAwardRouter,
};
