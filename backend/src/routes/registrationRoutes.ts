import { Router } from 'express';
import {
  startRegistration,
  saveStep,
  autoSave,
  getRegistrationById,
  completeRegistration,
  checkAvailability,
  getIncompleteRegistrationsCount,
} from '../controllers/registrationController';

const router = Router();

// Public registration progress endpoints
router.post('/start', startRegistration);
router.post('/save-step', saveStep);
router.post('/save', saveStep);
router.post('/auto-save', autoSave);
router.get('/check-availability', checkAvailability);
router.get('/incomplete/count', getIncompleteRegistrationsCount);
router.post('/complete', completeRegistration);
router.get('/:registrationId', getRegistrationById);

export default router;
