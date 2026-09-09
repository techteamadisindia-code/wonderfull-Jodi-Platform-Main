import { Router } from 'express';
import {
  getCountries,
  getStates,
  getDistricts,
  getSubDistricts,
  getCities,
  getVillages,
  searchLocationsHandler,
} from '../controllers/locationController';

const router = Router();

router.get('/search', searchLocationsHandler);
router.get('/countries', getCountries);
router.get('/states', getStates);
router.get('/districts', getDistricts);
router.get('/sub-districts', getSubDistricts);
router.get('/cities', getCities);
router.get('/villages', getVillages);

export default router;

