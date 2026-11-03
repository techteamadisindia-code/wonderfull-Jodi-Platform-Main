import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { checkRegistrationEnabled } from '../middleware/maintenanceMiddleware';
import {
  startRegistration,
  saveStep,
  autoSave,
  getRegistrationById,
  completeRegistration,
  validateRegistrationDraft,
  checkAvailability,
  getIncompleteRegistrationsCount,
} from '../controllers/registrationController';

const router = Router();

// Public registration progress endpoints (Gated by platform availability)
router.post('/start', checkRegistrationEnabled, startRegistration);
router.post('/save-step', checkRegistrationEnabled, saveStep);
router.post('/step', checkRegistrationEnabled, saveStep);
router.post('/save', checkRegistrationEnabled, saveStep);
router.post('/auto-save', checkRegistrationEnabled, autoSave);
router.get('/check-availability', checkAvailability);
router.get('/incomplete/count', requireAuth, requireRole('admin'), getIncompleteRegistrationsCount);
router.post('/validate', validateRegistrationDraft);
router.get('/:registrationId/validate', validateRegistrationDraft);
router.post('/:registrationId/validate', validateRegistrationDraft);
router.post('/complete', checkRegistrationEnabled, completeRegistration);
router.post('/:registrationId/step', checkRegistrationEnabled, saveStep);
router.post('/:registrationId/complete', checkRegistrationEnabled, completeRegistration);
router.get('/:registrationId', getRegistrationById);
router.get('/session/:registrationId', getRegistrationById);

export default router;
