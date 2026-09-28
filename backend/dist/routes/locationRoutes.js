"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const locationController_1 = require("../controllers/locationController");
const router = (0, express_1.Router)();
router.get('/search', locationController_1.searchLocationsHandler);
router.get('/locations/search', locationController_1.searchLocationsHandler);
router.get('/countries', locationController_1.getCountries);
router.get('/states', locationController_1.getStates);
router.get('/districts', locationController_1.getDistricts);
router.get('/sub-districts', locationController_1.getSubDistricts);
router.get('/talukas', locationController_1.getSubDistricts);
router.get('/tehsils', locationController_1.getSubDistricts);
router.get('/cities', locationController_1.getCities);
router.get('/villages', locationController_1.getVillages);
exports.default = router;
//# sourceMappingURL=locationRoutes.js.map