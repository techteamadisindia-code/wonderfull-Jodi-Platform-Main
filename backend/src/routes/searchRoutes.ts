import { Router } from 'express';
import { searchProfiles } from '../controllers/searchController';

const router = Router();

router.get('/', searchProfiles);

export default router;
