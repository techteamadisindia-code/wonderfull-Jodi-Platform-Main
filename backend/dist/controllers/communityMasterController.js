"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReligions = getReligions;
exports.getCastes = getCastes;
exports.getSubCastes = getSubCastes;
exports.getLanguages = getLanguages;
exports.validateCommunityHierarchy = validateCommunityHierarchy;
const mongoose_1 = __importDefault(require("mongoose"));
const CommunityMaster_1 = require("../models/CommunityMaster");
const securityUtils_1 = require("../utils/securityUtils");
/**
 * GET /api/community/religions
 */
async function getReligions(req, res, next) {
    try {
        const religions = await CommunityMaster_1.Religion.find({ isActive: true })
            .sort({ sortOrder: 1, name: 1 })
            .lean();
        return res.json({ success: true, count: religions.length, data: religions });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/community/castes?religionId=...&category=...&search=...
 */
async function getCastes(req, res, next) {
    try {
        const { religionId, religionName, category, search } = req.query;
        const filter = { isActive: true };
        let targetReligionId = religionId;
        if (!targetReligionId && religionName && typeof religionName === 'string') {
            const relDoc = await CommunityMaster_1.Religion.findOne({
                name: { $regex: new RegExp(`^${(0, securityUtils_1.escapeRegex)(religionName.trim())}$`, 'i') },
            });
            if (relDoc) {
                targetReligionId = relDoc._id.toString();
            }
        }
        if (targetReligionId && mongoose_1.default.isValidObjectId(targetReligionId)) {
            filter.religionId = targetReligionId;
        }
        if (category && typeof category === 'string' && category !== 'All' && category.trim()) {
            filter.category = category.trim();
        }
        if (search && typeof search === 'string' && search.trim()) {
            const safe = (0, securityUtils_1.escapeRegex)(search.trim());
            filter.$or = [
                { name: { $regex: new RegExp(safe, 'i') } },
                { aliases: { $regex: new RegExp(safe, 'i') } },
            ];
        }
        const castes = await CommunityMaster_1.Caste.find(filter)
            .populate('religionId', 'name')
            .sort({ name: 1 })
            .lean();
        return res.json({ success: true, count: castes.length, data: castes });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/community/sub-castes?casteId=...&search=...
 */
async function getSubCastes(req, res, next) {
    try {
        const { casteId, search } = req.query;
        if (!casteId || !mongoose_1.default.isValidObjectId(casteId)) {
            return res.status(400).json({ success: false, message: 'Valid casteId is required to fetch sub-castes.' });
        }
        const filter = { casteId, isActive: true };
        if (search && typeof search === 'string' && search.trim()) {
            const safe = (0, securityUtils_1.escapeRegex)(search.trim());
            filter.$or = [
                { name: { $regex: new RegExp(safe, 'i') } },
                { aliases: { $regex: new RegExp(safe, 'i') } },
            ];
        }
        const subCastes = await CommunityMaster_1.SubCaste.find(filter)
            .sort({ name: 1 })
            .lean();
        return res.json({ success: true, count: subCastes.length, data: subCastes });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/community/languages?search=...
 */
async function getLanguages(req, res, next) {
    try {
        const { search } = req.query;
        const filter = { isActive: true };
        if (search && typeof search === 'string' && search.trim()) {
            const safe = (0, securityUtils_1.escapeRegex)(search.trim());
            filter.$or = [
                { name: { $regex: new RegExp(safe, 'i') } },
                { nativeNames: { $regex: new RegExp(safe, 'i') } },
            ];
        }
        const languages = await CommunityMaster_1.Language.find(filter)
            .sort({ sortOrder: 1, name: 1 })
            .lean();
        return res.json({ success: true, count: languages.length, data: languages });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Validates Community / Caste hierarchy
 */
async function validateCommunityHierarchy(data) {
    try {
        const resolved = {};
        if (data.religionId) {
            if (!mongoose_1.default.isValidObjectId(data.religionId))
                return { isValid: false, error: 'Invalid religionId' };
            const rel = await CommunityMaster_1.Religion.findById(data.religionId);
            if (!rel)
                return { isValid: false, error: 'Religion not found' };
            resolved.religion = rel.name;
        }
        if (data.casteId) {
            if (!mongoose_1.default.isValidObjectId(data.casteId))
                return { isValid: false, error: 'Invalid casteId' };
            const caste = await CommunityMaster_1.Caste.findById(data.casteId);
            if (!caste)
                return { isValid: false, error: 'Caste not found' };
            if (data.religionId && caste.religionId.toString() !== data.religionId) {
                return { isValid: false, error: 'Selected Caste does not belong to the selected Religion.' };
            }
            resolved.caste = caste.name;
            resolved.category = caste.category;
        }
        if (data.subCasteId) {
            if (!mongoose_1.default.isValidObjectId(data.subCasteId))
                return { isValid: false, error: 'Invalid subCasteId' };
            const sub = await CommunityMaster_1.SubCaste.findById(data.subCasteId);
            if (!sub)
                return { isValid: false, error: 'Sub-caste not found' };
            if (data.casteId && sub.casteId.toString() !== data.casteId) {
                return { isValid: false, error: 'Selected Sub-Caste does not belong to the selected Caste.' };
            }
            resolved.subCaste = sub.name;
        }
        return { isValid: true, resolved };
    }
    catch (err) {
        return { isValid: false, error: err.message || 'Community validation failed' };
    }
}
//# sourceMappingURL=communityMasterController.js.map