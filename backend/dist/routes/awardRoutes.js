"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAwardRouter = exports.publicAwardRouter = void 0;
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const awardController_1 = require("../controllers/awardController");
// ─── PUBLIC AWARDS ROUTER ───
exports.publicAwardRouter = (0, express_1.Router)();
// GET /api/awards - List active awards (optional ?featured=true)
exports.publicAwardRouter.get('/', awardController_1.getPublicAwards);
// GET /api/awards/:slug - View single active award details
exports.publicAwardRouter.get('/:slug', awardController_1.getPublicAwardBySlug);
// ─── ADMIN AWARDS ROUTER (Super Admin & Admin Only) ───
exports.adminAwardRouter = (0, express_1.Router)();
// Enforce admin privileges
exports.adminAwardRouter.use(authMiddleware_1.requireAdminAuth);
// GET /api/admin/awards - List all awards with stats
exports.adminAwardRouter.get('/', awardController_1.getAdminAwards);
// POST /api/admin/awards - Create new award
exports.adminAwardRouter.post('/', awardController_1.createAward);
// POST /api/admin/awards/upload-image - Upload logo or gallery image
exports.adminAwardRouter.post('/upload-image', awardController_1.uploadAwardImage);
// GET /api/admin/awards/:id - Single award details
exports.adminAwardRouter.get('/:id', awardController_1.getAdminAwardById);
// PUT /api/admin/awards/:id - Update award
exports.adminAwardRouter.put('/:id', awardController_1.updateAward);
// DELETE /api/admin/awards/:id - Soft delete award
exports.adminAwardRouter.delete('/:id', awardController_1.deleteAward);
// PATCH /api/admin/awards/:id/status - Toggle active/inactive
exports.adminAwardRouter.patch('/:id/status', awardController_1.updateAwardStatus);
// PATCH /api/admin/awards/:id/featured - Toggle homepage featured
exports.adminAwardRouter.patch('/:id/featured', awardController_1.toggleAwardFeatured);
// PATCH /api/admin/awards/:id/order - Update display order
exports.adminAwardRouter.patch('/:id/order', awardController_1.updateAwardOrder);
exports.default = {
    publicAwardRouter: exports.publicAwardRouter,
    adminAwardRouter: exports.adminAwardRouter,
};
//# sourceMappingURL=awardRoutes.js.map