"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCountries = getCountries;
exports.getStates = getStates;
exports.getDistricts = getDistricts;
exports.getSubDistricts = getSubDistricts;
exports.getCities = getCities;
exports.getVillages = getVillages;
exports.validateLocationHierarchy = validateLocationHierarchy;
exports.searchLocationsHandler = searchLocationsHandler;
const prismaBridge_1 = __importDefault(require("../db/prismaBridge"));
const Location_1 = require("../models/Location");
const securityUtils_1 = require("../utils/securityUtils");
/**
 * GET /api/locations/countries
 */
async function getCountries(req, res, next) {
    try {
        const { search } = req.query;
        const filter = { isActive: true };
        if (search && typeof search === 'string' && search.trim()) {
            filter.name = { $regex: new RegExp((0, securityUtils_1.escapeRegex)(search.trim()), 'i') };
        }
        const countries = await Location_1.Country.find(filter)
            .sort({ sortOrder: 1, name: 1 })
            .lean();
        return res.json({ success: true, count: countries.length, data: countries });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/locations/states
 */
async function getStates(req, res, next) {
    try {
        const { countryId, countryCode, search } = req.query;
        let targetCountryId = countryId;
        if (!targetCountryId) {
            const countryQuery = countryCode ? { code: String(countryCode).toUpperCase() } : { code: 'IN' };
            const countryDoc = await Location_1.Country.findOne(countryQuery);
            if (countryDoc) {
                targetCountryId = countryDoc._id.toString();
            }
        }
        const filter = { isActive: true };
        if (targetCountryId && prismaBridge_1.default.isValidObjectId(targetCountryId)) {
            filter.countryId = targetCountryId;
        }
        if (search && typeof search === 'string' && search.trim()) {
            filter.name = { $regex: new RegExp((0, securityUtils_1.escapeRegex)(search.trim()), 'i') };
        }
        const states = await Location_1.State.find(filter)
            .sort({ sortOrder: 1, name: 1 })
            .lean();
        return res.json({ success: true, count: states.length, data: states });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/locations/districts?stateId=...
 */
async function getDistricts(req, res, next) {
    try {
        const { stateId, stateName, search } = req.query;
        const targetState = stateId || stateName || req.query.state;
        if (!targetState) {
            return res.status(400).json({ success: false, message: 'Valid stateId query parameter is required.' });
        }
        let stateDoc = null;
        if (prismaBridge_1.default.isValidObjectId(targetState)) {
            stateDoc = await Location_1.State.findById(targetState);
        }
        if (!stateDoc) {
            stateDoc = await Location_1.State.findOne({
                name: { $regex: new RegExp(`^${(0, securityUtils_1.escapeRegex)(String(targetState).trim())}$`, 'i') },
            });
        }
        if (!stateDoc) {
            return res.status(404).json({ success: false, message: 'Specified state not found.' });
        }
        const filter = { stateId: stateDoc._id.toString(), isActive: true };
        if (search && typeof search === 'string' && search.trim()) {
            filter.name = { $regex: new RegExp((0, securityUtils_1.escapeRegex)(search.trim()), 'i') };
        }
        const districts = await Location_1.District.find(filter)
            .sort({ name: 1 })
            .lean();
        return res.json({ success: true, count: districts.length, data: districts });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/locations/sub-districts?districtId=...
 */
async function getSubDistricts(req, res, next) {
    try {
        const { districtId, search } = req.query;
        if (!districtId || !prismaBridge_1.default.isValidObjectId(districtId)) {
            return res.status(400).json({ success: false, message: 'Valid districtId query parameter is required.' });
        }
        const districtDoc = await Location_1.District.findById(districtId);
        if (!districtDoc) {
            return res.status(404).json({ success: false, message: 'Specified district not found.' });
        }
        const filter = { districtId, isActive: true };
        if (search && typeof search === 'string' && search.trim()) {
            filter.name = { $regex: new RegExp((0, securityUtils_1.escapeRegex)(search.trim()), 'i') };
        }
        const subDistricts = await Location_1.SubDistrict.find(filter)
            .sort({ name: 1 })
            .lean();
        return res.json({ success: true, count: subDistricts.length, data: subDistricts });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/locations/cities?districtId=...&subDistrictId=...&search=...&page=1&limit=20
 */
async function getCities(req, res, next) {
    try {
        const { districtId, subDistrictId, stateId, search, page = '1', limit = '30' } = req.query;
        const filter = { isActive: true };
        const targetState = stateId || req.query.state;
        if (targetState) {
            if (prismaBridge_1.default.isValidObjectId(targetState)) {
                filter.stateId = targetState;
            }
            else {
                const stateDoc = await Location_1.State.findOne({
                    name: { $regex: new RegExp(`^${(0, securityUtils_1.escapeRegex)(String(targetState).trim())}$`, 'i') },
                });
                if (stateDoc) {
                    filter.stateId = stateDoc._id;
                }
                else {
                    return res.json({
                        success: true,
                        data: [],
                        pagination: { total: 0, page: 1, limit: 30, pages: 0 },
                    });
                }
            }
        }
        const targetDistrict = districtId || req.query.district;
        if (targetDistrict) {
            if (prismaBridge_1.default.isValidObjectId(targetDistrict)) {
                filter.districtId = targetDistrict;
            }
            else {
                const distDoc = await Location_1.District.findOne({
                    name: { $regex: new RegExp(`^${(0, securityUtils_1.escapeRegex)(String(targetDistrict).trim())}$`, 'i') },
                    ...(filter.stateId ? { stateId: filter.stateId } : {}),
                });
                if (distDoc) {
                    filter.districtId = distDoc._id;
                }
            }
        }
        if (subDistrictId && prismaBridge_1.default.isValidObjectId(subDistrictId)) {
            filter.subDistrictId = subDistrictId;
        }
        if (search && typeof search === 'string' && search.trim()) {
            filter.name = { $regex: new RegExp((0, securityUtils_1.escapeRegex)(search.trim()), 'i') };
        }
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 30));
        const skip = (pageNum - 1) * limitNum;
        let [total, cities] = await Promise.all([
            Location_1.City.countDocuments(filter),
            Location_1.City.find(filter)
                .populate('districtId', 'name')
                .populate('stateId', 'name code')
                .sort({ sortOrder: 1, name: 1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);
        // Fallback: If no municipal cities are found in DB for a specific district,
        // provide the district headquarters/name as a valid city option so user is not blocked
        if ((!cities || cities.length === 0) && filter.districtId) {
            const dist = await Location_1.District.findById(filter.districtId).lean();
            if (dist) {
                cities = [
                    {
                        _id: dist._id,
                        id: dist._id.toString(),
                        name: dist.headquarters || dist.name,
                        districtId: dist._id,
                        stateId: dist.stateId,
                        type: 'District City',
                        isActive: true,
                        sortOrder: 1,
                    },
                ];
                total = 1;
            }
        }
        return res.json({
            success: true,
            data: cities,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum) || 1,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/locations/villages?subDistrictId=...&search=...&page=1&limit=20
 */
async function getVillages(req, res, next) {
    try {
        const { subDistrictId, districtId, search, page = '1', limit = '30' } = req.query;
        if (!subDistrictId || !prismaBridge_1.default.isValidObjectId(subDistrictId)) {
            return res.status(400).json({ success: false, message: 'Valid subDistrictId is required to search villages.' });
        }
        // Verify sub-district existence and parent consistency
        if (districtId && prismaBridge_1.default.isValidObjectId(districtId)) {
            const validSub = await Location_1.SubDistrict.findOne({ _id: subDistrictId, districtId });
            if (!validSub) {
                return res.status(400).json({ success: false, message: 'Sub-district does not belong to the provided district.' });
            }
        }
        const filter = { subDistrictId, isActive: true };
        if (search && typeof search === 'string' && search.trim()) {
            filter.name = { $regex: new RegExp((0, securityUtils_1.escapeRegex)(search.trim()), 'i') };
        }
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 30));
        const skip = (pageNum - 1) * limitNum;
        const [total, villages] = await Promise.all([
            Location_1.Village.countDocuments(filter),
            Location_1.Village.find(filter)
                .sort({ name: 1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);
        return res.json({
            success: true,
            data: villages,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Validates full location hierarchy to prevent invalid combinations
 */
async function validateLocationHierarchy(data) {
    try {
        const resolved = {};
        if (data.countryId) {
            if (!prismaBridge_1.default.isValidObjectId(data.countryId))
                return { isValid: false, error: 'Invalid countryId' };
            const country = await Location_1.Country.findById(data.countryId);
            if (!country)
                return { isValid: false, error: 'Country not found' };
            resolved.country = country.name;
        }
        if (data.stateId) {
            if (!prismaBridge_1.default.isValidObjectId(data.stateId))
                return { isValid: false, error: 'Invalid stateId' };
            const state = await Location_1.State.findById(data.stateId);
            if (!state)
                return { isValid: false, error: 'State not found' };
            if (data.countryId && state.countryId.toString() !== data.countryId) {
                return { isValid: false, error: 'Selected State does not belong to the selected Country.' };
            }
            resolved.state = state.name;
        }
        if (data.districtId) {
            if (!prismaBridge_1.default.isValidObjectId(data.districtId))
                return { isValid: false, error: 'Invalid districtId' };
            const district = await Location_1.District.findById(data.districtId);
            if (!district)
                return { isValid: false, error: 'District not found' };
            if (data.stateId && district.stateId.toString() !== data.stateId) {
                return { isValid: false, error: 'Selected District does not belong to the selected State.' };
            }
            resolved.district = district.name;
        }
        if (data.subDistrictId) {
            if (!prismaBridge_1.default.isValidObjectId(data.subDistrictId))
                return { isValid: false, error: 'Invalid subDistrictId' };
            const subDistrict = await Location_1.SubDistrict.findById(data.subDistrictId);
            if (!subDistrict)
                return { isValid: false, error: 'Sub-District not found' };
            if (data.districtId && subDistrict.districtId.toString() !== data.districtId) {
                return { isValid: false, error: 'Selected Sub-District does not belong to the selected District.' };
            }
            resolved.subDistrict = subDistrict.name;
            resolved.subDistrictType = subDistrict.type;
        }
        if (data.cityId) {
            const isHqPrefix = typeof data.cityId === 'string' && data.cityId.startsWith('hq-');
            const cleanCityId = isHqPrefix ? data.cityId.replace('hq-', '') : data.cityId;
            if (isHqPrefix || cleanCityId === data.districtId) {
                if (prismaBridge_1.default.isValidObjectId(cleanCityId)) {
                    const district = await Location_1.District.findById(cleanCityId);
                    if (district) {
                        resolved.city = district.headquarters || district.name;
                    }
                    else {
                        return { isValid: false, error: 'District not found for headquarters fallback' };
                    }
                }
            }
            else {
                if (!prismaBridge_1.default.isValidObjectId(cleanCityId))
                    return { isValid: false, error: 'Invalid cityId' };
                const city = await Location_1.City.findById(cleanCityId);
                if (!city) {
                    // Check if cleanCityId points to a District as fallback
                    const distFallback = await Location_1.District.findById(cleanCityId);
                    if (distFallback) {
                        resolved.city = distFallback.headquarters || distFallback.name;
                    }
                    else {
                        return { isValid: false, error: 'City not found' };
                    }
                }
                else {
                    if (data.districtId && city.districtId.toString() !== data.districtId) {
                        return { isValid: false, error: 'Selected City does not belong to the selected District.' };
                    }
                    resolved.city = city.name;
                }
            }
        }
        if (data.villageId) {
            if (!prismaBridge_1.default.isValidObjectId(data.villageId))
                return { isValid: false, error: 'Invalid villageId' };
            const village = await Location_1.Village.findById(data.villageId);
            if (!village)
                return { isValid: false, error: 'Village not found' };
            if (data.subDistrictId && village.subDistrictId.toString() !== data.subDistrictId) {
                return { isValid: false, error: 'Selected Village does not belong to the selected Sub-District.' };
            }
            resolved.village = village.name;
        }
        return { isValid: true, resolved };
    }
    catch (err) {
        return { isValid: false, error: err.message || 'Hierarchy validation failed' };
    }
}
/**
 * GET /api/locations/search?q=
 * Public Autocomplete search for Country, State, District, Taluka/Tehsil, City, and Village
 */
async function searchLocationsHandler(req, res, next) {
    try {
        const { q } = req.query;
        const { searchStructuredLocations } = await Promise.resolve().then(() => __importStar(require('../services/locationService')));
        const results = await searchStructuredLocations(typeof q === 'string' ? q : '');
        return res.json({ success: true, count: results.length, data: results });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=locationController.js.map