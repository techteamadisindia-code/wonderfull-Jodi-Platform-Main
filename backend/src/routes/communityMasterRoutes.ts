import { Router } from 'express';
import {
  getReligions,
  getCastes,
  getSubCastes,
  getLanguages,
} from '../controllers/communityMasterController';

const router = Router();

router.get('/religions', getReligions);
router.get('/castes', getCastes);
router.get('/sub-castes', getSubCastes);
router.get('/languages', getLanguages);

export default router;
