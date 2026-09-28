"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const registrationController_1 = require("../controllers/registrationController");
const router = (0, express_1.Router)();
// Public registration progress endpoints
router.post('/start', registrationController_1.startRegistration);
router.post('/save-step', registrationController_1.saveStep);
router.post('/step', registrationController_1.saveStep);
router.post('/save', registrationController_1.saveStep);
router.post('/auto-save', registrationController_1.autoSave);
router.get('/check-availability', registrationController_1.checkAvailability);
router.get('/incomplete/count', registrationController_1.getIncompleteRegistrationsCount);
router.post('/validate', registrationController_1.validateRegistrationDraft);
router.get('/:registrationId/validate', registrationController_1.validateRegistrationDraft);
router.post('/:registrationId/validate', registrationController_1.validateRegistrationDraft);
router.post('/complete', registrationController_1.completeRegistration);
router.post('/:registrationId/step', registrationController_1.saveStep);
router.post('/:registrationId/complete', registrationController_1.completeRegistration);
router.get('/:registrationId', registrationController_1.getRegistrationById);
exports.default = router;
//# sourceMappingURL=registrationRoutes.js.map