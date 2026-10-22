"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminMasterDataController_1 = require("../controllers/adminMasterDataController");
const router = (0, express_1.Router)();
// Apply admin authentication to all master-data routes
router.use(authMiddleware_1.requireAuth, (0, authMiddleware_1.requireRole)('admin'));
router.get('/summary', adminMasterDataController_1.getMasterDataSummary);
router.get('/items', adminMasterDataController_1.getMasterDataItems);
router.post('/items', adminMasterDataController_1.createMasterDataItem);
router.put('/items/:id', adminMasterDataController_1.updateMasterDataItem);
router.delete('/items/:id', adminMasterDataController_1.deleteMasterDataItem);
router.post('/import', adminMasterDataController_1.handleBulkImport);
// Location PDF Upload & Import Workflows
router.post('/upload-pdf', adminMasterDataController_1.uploadLocationPdf);
router.post('/import/confirm', adminMasterDataController_1.confirmLocationImport);
router.get('/import-history', adminMasterDataController_1.getImportHistory);
router.get('/import-history/:id/error-report', adminMasterDataController_1.downloadImportErrorReport);
exports.default = router;
//# sourceMappingURL=adminMasterDataRoutes.js.map