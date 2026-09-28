"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const rateLimiters_1 = require("../middleware/rateLimiters");
const kundaliController_1 = require("../controllers/kundaliController");
const router = (0, express_1.Router)();
// ─── 100% FREE PUBLIC KUNDALI MATCH ───
// Anyone (guests, non-registered users, logged-in members) can calculate without authentication
router.post('/match', rateLimiters_1.kundaliLimiter, authMiddleware_1.optionalAuth, kundaliController_1.matchPublicKundali);
router.get('/locations', authMiddleware_1.optionalAuth, kundaliController_1.getLocations);
// ─── AUTHENTICATED USER ENDPOINTS ───
router.get('/my-birth-details', authMiddleware_1.requireAuth, kundaliController_1.getMyBirthDetails);
router.put('/my-birth-details', authMiddleware_1.requireAuth, kundaliController_1.updateMyBirthDetails);
router.post('/calculate', authMiddleware_1.requireAuth, kundaliController_1.calculateKundali);
router.post('/save', authMiddleware_1.requireAuth, kundaliController_1.saveKundaliMatch);
router.get('/report/:id', authMiddleware_1.requireAuth, kundaliController_1.getKundaliReport);
router.get('/history', authMiddleware_1.requireAuth, kundaliController_1.getKundaliHistory);
exports.default = router;
//# sourceMappingURL=kundaliRoutes.js.map