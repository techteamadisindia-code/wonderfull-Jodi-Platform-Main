"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const communityMasterController_1 = require("../controllers/communityMasterController");
const router = (0, express_1.Router)();
router.get('/religions', communityMasterController_1.getReligions);
router.get('/castes', communityMasterController_1.getCastes);
router.get('/sub-castes', communityMasterController_1.getSubCastes);
router.get('/languages', communityMasterController_1.getLanguages);
exports.default = router;
//# sourceMappingURL=communityMasterRoutes.js.map