"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProfiles = searchProfiles;
const prismaBridge_1 = __importDefault(require("../db/prismaBridge"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Profile_1 = require("../models/Profile");
const User_1 = require("../models/User");
const Block_1 = require("../models/Block");
const securityUtils_1 = require("../utils/securityUtils");
const profileController_1 = require("./profileController");
async function searchProfiles(req, res, next) {
    try {
        const { gender, lookingFor, religion, religionId, caste, casteId, city, cityId, location, state, stateId, districtId, country, countryId, education, profession, specialization, maritalStatus, motherTongue, motherTongueId, ageFrom, ageTo, ageMin, ageMax, minAge, maxAge, verified, hasPhoto, foodPreference, diet, smoking, drinking, page = '1', limit = '12', sort = 'bestMatch', order = 'desc', } = req.query;
        // Check optional authenticated user to exclude self and blocked profiles
        let currentUserId = null;
        let blockedUserIds = [];
        const authHeader = req.headers.authorization;
        const cookieToken = req.cookies?.access_token;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;
        if (token) {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET ?? 'supersecret_wonderfuljodi_dev_key_2026');
                if (decoded?.userId || decoded?.id) {
                    currentUserId = decoded.userId || decoded.id;
                    // Find users blocked by or who blocked current user
                    const blocks = await Block_1.Block.find({
                        $or: [{ blocker: currentUserId }, { blockedUser: currentUserId }],
                    });
                    blockedUserIds = blocks.map((b) => b.blocker.toString() === currentUserId ? b.blockedUser.toString() : b.blocker.toString());
                }
            }
            catch {
                // Continue unauthenticated
            }
        }
        // Get active user IDs to ensure suspended/inactive users are not returned
        const excludedIds = new Set();
        if (currentUserId)
            excludedIds.add(currentUserId);
        blockedUserIds.forEach((id) => excludedIds.add(id));
        const activeUsers = await User_1.User.find({
            isActive: true,
            isDeleted: { $ne: true },
            status: { $nin: ['Suspended', 'Blocked', 'Deleted'] },
            ...(excludedIds.size > 0 ? { _id: { $nin: Array.from(excludedIds) } } : {}),
        }).select('_id');
        const activeUserIds = activeUsers.map((u) => u._id);
        const filters = {
            user: { $in: activeUserIds },
            isDeleted: { $ne: true },
            status: { $nin: ['Suspended', 'Blocked', 'Deleted'] },
        };
        // Gender filter (safely match without arbitrary regex)
        const rawGender = (gender || lookingFor || '').trim();
        if (rawGender) {
            const gLower = rawGender.toLowerCase();
            if (gLower === 'female' || gLower === 'bride' || gLower === 'brides') {
                filters.gender = 'Female';
            }
            else if (gLower === 'male' || gLower === 'groom' || gLower === 'grooms') {
                filters.gender = 'Male';
            }
            else if (gLower !== 'all' && gLower !== 'any' && gLower !== '') {
                filters.gender = rawGender === 'Other' ? 'Other' : rawGender;
            }
        }
        // Religion filter
        if (religionId && prismaBridge_1.default.isValidObjectId(religionId)) {
            filters['communityDetails.religionId'] = religionId;
        }
        else if (religion) {
            const cleanRel = religion.trim();
            const relLower = cleanRel.toLowerCase();
            if (relLower !== 'all' && relLower !== 'any' && relLower !== 'any religion' && cleanRel !== '') {
                filters.religion = { $regex: new RegExp(`^${(0, securityUtils_1.escapeRegex)(cleanRel)}$`, 'i') };
            }
        }
        // Caste filter
        if (casteId && prismaBridge_1.default.isValidObjectId(casteId)) {
            filters['communityDetails.casteId'] = casteId;
        }
        else if (caste && caste !== 'All' && caste !== 'Any' && caste.trim() !== '') {
            filters.caste = { $regex: new RegExp((0, securityUtils_1.escapeRegex)(caste.trim()), 'i') };
        }
        // Structured Location IDs
        if (cityId && prismaBridge_1.default.isValidObjectId(cityId)) {
            filters['currentLocation.cityId'] = cityId;
        }
        if (districtId && prismaBridge_1.default.isValidObjectId(districtId)) {
            filters['currentLocation.districtId'] = districtId;
        }
        if (stateId && prismaBridge_1.default.isValidObjectId(stateId)) {
            filters['currentLocation.stateId'] = stateId;
        }
        if (countryId && prismaBridge_1.default.isValidObjectId(countryId)) {
            filters['currentLocation.countryId'] = countryId;
        }
        // Location / City filter fallback (escaped regex)
        const rawLocation = (location || city || '').trim();
        if (!cityId && rawLocation) {
            const locLower = rawLocation.toLowerCase();
            if (locLower !== 'all' && locLower !== 'any' && locLower !== 'any location' && rawLocation !== '') {
                const safeLoc = (0, securityUtils_1.escapeRegex)(rawLocation);
                filters.$or = [
                    { city: { $regex: new RegExp(safeLoc, 'i') } },
                    { state: { $regex: new RegExp(safeLoc, 'i') } },
                    { country: { $regex: new RegExp(safeLoc, 'i') } },
                ];
            }
        }
        if (!stateId && state && state !== 'All' && state !== 'Any' && state.trim() !== '') {
            filters.state = { $regex: new RegExp((0, securityUtils_1.escapeRegex)(state.trim()), 'i') };
        }
        if (!countryId && country && country !== 'All' && country !== 'Any' && country.trim() !== '') {
            filters.country = country.trim();
        }
        if (maritalStatus && maritalStatus !== 'All' && maritalStatus !== 'Any' && maritalStatus.trim() !== '') {
            filters.maritalStatus = maritalStatus.trim();
        }
        if (motherTongueId && prismaBridge_1.default.isValidObjectId(motherTongueId)) {
            filters['languageDetails.motherTongueId'] = motherTongueId;
        }
        else if (motherTongue && motherTongue !== 'All' && motherTongue !== 'Any' && motherTongue.trim() !== '') {
            filters.motherTongue = motherTongue.trim();
        }
        // Diet filter
        const selectedDiet = (diet || foodPreference || '').trim();
        if (selectedDiet && selectedDiet !== 'All' && selectedDiet !== 'Any') {
            filters.foodPreference = selectedDiet;
        }
        if (smoking && smoking !== 'All' && smoking !== 'Any' && smoking.trim() !== '') {
            filters.smoking = smoking.trim();
        }
        if (drinking && drinking !== 'All' && drinking !== 'Any' && drinking.trim() !== '') {
            filters.drinking = drinking.trim();
        }
        if (verified === 'true') {
            filters.verificationStatus = 'VERIFIED';
        }
        if (hasPhoto === 'true') {
            filters.primaryPhoto = { $exists: true, $ne: '' };
        }
        // Specialization / Profession (escaped regex)
        const spec = (specialization || '').trim();
        const prof = (profession || '').trim();
        if (spec && spec !== 'All' && spec !== 'Any') {
            const safeSpec = (0, securityUtils_1.escapeRegex)(spec);
            const specRegex = new RegExp(safeSpec, 'i');
            filters.$and = filters.$and || [];
            filters.$and.push({
                $or: [
                    { profession: { $regex: specRegex } },
                    { degree: { $regex: specRegex } },
                    { education: { $regex: specRegex } },
                ],
            });
        }
        else if (prof && prof !== 'All' && prof !== 'Any') {
            filters.profession = { $regex: new RegExp((0, securityUtils_1.escapeRegex)(prof), 'i') };
        }
        // Education (escaped regex)
        const edu = (education || '').trim();
        if (edu && edu !== 'All' && edu !== 'Any') {
            const safeEdu = (0, securityUtils_1.escapeRegex)(edu);
            const eduRegex = new RegExp(safeEdu, 'i');
            filters.$and = filters.$and || [];
            filters.$and.push({
                $or: [{ education: { $regex: eduRegex } }, { degree: { $regex: eduRegex } }],
            });
        }
        // Age Calculation
        const effectiveMinAge = Number(ageFrom || minAge || ageMin);
        const effectiveMaxAge = Number(ageTo || maxAge || ageMax);
        const ageFilters = {};
        const now = new Date();
        if (effectiveMaxAge > 0 && effectiveMaxAge <= 100) {
            const maxDate = new Date(now.getFullYear() - effectiveMaxAge - 1, now.getMonth(), now.getDate());
            ageFilters.$gte = maxDate;
        }
        if (effectiveMinAge > 0 && effectiveMinAge <= 100) {
            const minDate = new Date(now.getFullYear() - effectiveMinAge, now.getMonth(), now.getDate());
            ageFilters.$lte = minDate;
        }
        if (Object.keys(ageFilters).length) {
            filters.dob = ageFilters;
        }
        const pageNumber = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
        // Dynamic sort handling with safe allowlist
        let sortQuery = { createdAt: -1 };
        if (sort === 'bestMatch') {
            sortQuery = { verificationStatus: 1, lastActiveAt: -1 };
        }
        else if (sort === 'recentlyActive' || sort === 'recent') {
            sortQuery = { lastActiveAt: -1 };
        }
        else if (sort === 'newest') {
            sortQuery = { createdAt: -1 };
        }
        else if (sort === 'ageAsc') {
            sortQuery = { dob: -1 }; // Younger first
        }
        else if (sort === 'ageDesc') {
            sortQuery = { dob: 1 }; // Older first
        }
        const [total, rawProfiles] = await Promise.all([
            Profile_1.Profile.countDocuments(filters),
            Profile_1.Profile.find(filters)
                .sort(sortQuery)
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .populate('user', 'fullName role verificationStatus verified'),
        ]);
        // Serialize profiles securely (strips candidate identity if not authenticated)
        const sanitizedProfiles = [];
        for (const p of rawProfiles) {
            const serialized = (0, securityUtils_1.serializePublicProfile)(p, { viewerUserId: currentUserId || undefined });
            if (serialized) {
                if (sort === 'bestMatch' && serialized.candidateId) {
                    const resolved = await (0, profileController_1.findCanonicalProfile)(serialized.candidateId);
                    if (!resolved) {
                        console.warn(`[Search/Featured] Profile candidateId could not resolve: candidateId=${serialized.candidateId}, recordId=${p._id || p.id}`);
                        continue;
                    }
                }
                sanitizedProfiles.push(serialized);
            }
        }
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.json({
            success: true,
            data: {
                total,
                page: pageNumber,
                limit: pageSize,
                profiles: sanitizedProfiles,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=searchController.js.map