"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const institutionController_1 = require("../controllers/institutionController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public search with debounced frontend querying
router.get('/search', institutionController_1.searchInstitutions);
// Create new institution or match existing (supports both unauthenticated applicants & logged-in doctors)
router.post('/', authMiddleware_1.optionalAuth, institutionController_1.createInstitution);
// Get by ID
router.get('/:id', institutionController_1.getInstitutionById);
exports.default = router;
//# sourceMappingURL=institutionRoutes.js.map