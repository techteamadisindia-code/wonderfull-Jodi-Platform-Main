import { Router } from 'express';
import {
  searchInstitutions,
  createInstitution,
  getInstitutionById,
} from '../controllers/institutionController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

// Public search with debounced frontend querying
router.get('/search', searchInstitutions);

// Create new institution or match existing (supports both unauthenticated applicants & logged-in doctors)
router.post('/', optionalAuth, createInstitution);

// Get by ID
router.get('/:id', getInstitutionById);

export default router;
