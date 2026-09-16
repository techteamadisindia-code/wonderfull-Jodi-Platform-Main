import { Router } from 'express';
import {
  getActivePublicCampaigns,
  getAdminCampaigns,
  createAdminCampaign,
  updateAdminCampaign,
  deleteAdminCampaign,
  previewMemberEligibility,
} from '../controllers/campaignController';
import { requireAdminAuth } from '../middleware/authMiddleware';

const router = Router();

// Public: Get active promotional campaign banners
router.get('/active', getActivePublicCampaigns);

// Admin: Campaign & Rule Engine Management
router.get('/admin', requireAdminAuth, getAdminCampaigns);
router.post('/admin', requireAdminAuth, createAdminCampaign);
router.patch('/admin/:id', requireAdminAuth, updateAdminCampaign);
router.put('/admin/:id', requireAdminAuth, updateAdminCampaign);
router.delete('/admin/:id', requireAdminAuth, deleteAdminCampaign);
router.post('/admin/preview-eligibility', requireAdminAuth, previewMemberEligibility);

export default router;
