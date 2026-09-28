"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const campaignController_1 = require("../controllers/campaignController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public: Get active promotional campaign banners
router.get('/active', campaignController_1.getActivePublicCampaigns);
// Admin: Campaign & Rule Engine Management
router.get('/admin', authMiddleware_1.requireAdminAuth, campaignController_1.getAdminCampaigns);
router.post('/admin', authMiddleware_1.requireAdminAuth, campaignController_1.createAdminCampaign);
router.patch('/admin/:id', authMiddleware_1.requireAdminAuth, campaignController_1.updateAdminCampaign);
router.put('/admin/:id', authMiddleware_1.requireAdminAuth, campaignController_1.updateAdminCampaign);
router.delete('/admin/:id', authMiddleware_1.requireAdminAuth, campaignController_1.deleteAdminCampaign);
router.post('/admin/preview-eligibility', authMiddleware_1.requireAdminAuth, campaignController_1.previewMemberEligibility);
exports.default = router;
//# sourceMappingURL=campaignRoutes.js.map