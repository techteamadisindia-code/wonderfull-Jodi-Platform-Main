"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const biodataController_1 = require("../controllers/biodataController");
const router = (0, express_1.Router)();
// Public View Route (Unauthenticated for WhatsApp/Public sharing)
router.get('/public/:publicId', biodataController_1.getPublicBiodata);
// Authenticated Routes
router.get('/profile', authMiddleware_1.requireAuth, biodataController_1.getProfileForBiodata);
router.get('/admin/stats', authMiddleware_1.requireAuth, (0, authMiddleware_1.requireRole)('admin'), biodataController_1.getAdminBiodataStats);
router.get('/', authMiddleware_1.requireAuth, biodataController_1.listBiodatas);
router.post('/', authMiddleware_1.requireAuth, biodataController_1.createBiodata);
router.get('/:id', authMiddleware_1.requireAuth, biodataController_1.getBiodataById);
router.put('/:id', authMiddleware_1.requireAuth, biodataController_1.updateBiodata);
router.patch('/:id', authMiddleware_1.requireAuth, biodataController_1.updateBiodata);
router.delete('/:id', authMiddleware_1.requireAuth, biodataController_1.deleteBiodata);
// PDF Generation & Download
router.post('/:id/generate-pdf', authMiddleware_1.requireAuth, biodataController_1.generateBiodataPdf);
router.get('/:id/pdf', authMiddleware_1.requireAuth, biodataController_1.downloadBiodataPdf);
exports.default = router;
//# sourceMappingURL=biodataRoutes.js.map