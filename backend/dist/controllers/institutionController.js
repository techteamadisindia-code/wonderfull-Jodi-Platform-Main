"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchInstitutions = searchInstitutions;
exports.createInstitution = createInstitution;
exports.getInstitutionById = getInstitutionById;
exports.seedDefaultInstitutionsIfEmpty = seedDefaultInstitutionsIfEmpty;
const Institution_1 = require("../models/Institution");
const securityUtils_1 = require("../utils/securityUtils");
/**
 * 1. SEARCH INSTITUTIONS (GET /api/institutions/search?q=...)
 * Returns matching medical colleges, universities, and hospitals
 * - Case-insensitive
 * - Substring / prefix matching
 * - Sorted by usage count (popularity) and alphabetical name
 * - Minimum 2 characters required
 */
async function searchInstitutions(req, res, next) {
    try {
        const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        if (!rawQuery || rawQuery.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must contain at least 2 characters.',
                data: [],
            });
        }
        const escaped = (0, securityUtils_1.escapeRegex)(rawQuery);
        const regex = new RegExp(escaped, 'i');
        const limit = Math.min(25, Math.max(1, parseInt(String(req.query.limit || 15), 10)));
        const institutions = await Institution_1.Institution.find({
            $or: [
                { name: regex },
                { normalizedName: new RegExp((0, securityUtils_1.escapeRegex)((0, Institution_1.normalizeInstitutionName)(rawQuery)), 'i') },
                { city: regex },
                { state: regex },
            ],
        })
            .sort({ usageCount: -1, name: 1 })
            .limit(limit)
            .select('_id name normalizedName type city state country usageCount isVerified')
            .lean();
        return res.json({
            success: true,
            query: rawQuery,
            count: institutions.length,
            data: institutions,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * 2. CREATE INSTITUTION (POST /api/institutions)
 * Adds a new institution or returns existing duplicate if matched
 */
async function createInstitution(req, res, next) {
    try {
        const { name, type = 'COLLEGE', city = '', state = '', country = 'India' } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Institution name is required and must be at least 2 characters long.',
            });
        }
        const trimmedName = name.trim();
        if (trimmedName.length > 250) {
            return res.status(400).json({
                success: false,
                message: 'Institution name cannot exceed 250 characters.',
            });
        }
        const normalized = (0, Institution_1.normalizeInstitutionName)(trimmedName);
        if (!normalized) {
            return res.status(400).json({
                success: false,
                message: 'Invalid institution name.',
            });
        }
        // Check if institution already exists by normalized name to prevent duplicates
        let existing = await Institution_1.Institution.findOne({ normalizedName: normalized });
        if (existing) {
            // Increment usage count for existing institution
            existing.usageCount = (existing.usageCount || 1) + 1;
            if (!existing.city && city)
                existing.city = String(city).trim();
            if (!existing.state && state)
                existing.state = String(state).trim();
            await existing.save();
            return res.status(200).json({
                success: true,
                isNew: false,
                message: 'Existing institution record matched and updated.',
                data: {
                    _id: existing._id,
                    name: existing.name,
                    normalizedName: existing.normalizedName,
                    type: existing.type,
                    city: existing.city,
                    state: existing.state,
                    country: existing.country,
                    usageCount: existing.usageCount,
                    isVerified: existing.isVerified,
                },
            });
        }
        const validTypes = ['COLLEGE', 'UNIVERSITY', 'HOSPITAL', 'INSTITUTE'];
        const instType = validTypes.includes(type) ? type : 'COLLEGE';
        const newInst = await Institution_1.Institution.create({
            name: trimmedName,
            normalizedName: normalized,
            type: instType,
            city: typeof city === 'string' ? city.trim() : '',
            state: typeof state === 'string' ? state.trim() : '',
            country: typeof country === 'string' ? country.trim() : 'India',
            usageCount: 1,
            createdBy: req.user?.userId || null,
            isVerified: false,
        });
        return res.status(201).json({
            success: true,
            isNew: true,
            message: 'Institution created successfully in Wonderful Jodi database.',
            data: {
                _id: newInst._id,
                name: newInst.name,
                normalizedName: newInst.normalizedName,
                type: newInst.type,
                city: newInst.city,
                state: newInst.state,
                country: newInst.country,
                usageCount: newInst.usageCount,
                isVerified: newInst.isVerified,
            },
        });
    }
    catch (error) {
        if (error.code === 11000) {
            // Race condition duplicate key error
            const normalized = (0, Institution_1.normalizeInstitutionName)(req.body.name || '');
            const existing = await Institution_1.Institution.findOne({ normalizedName: normalized });
            if (existing) {
                return res.status(200).json({
                    success: true,
                    isNew: false,
                    message: 'Existing institution record matched.',
                    data: existing,
                });
            }
        }
        next(error);
    }
}
/**
 * 3. GET INSTITUTION BY ID (GET /api/institutions/:id)
 */
async function getInstitutionById(req, res, next) {
    try {
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Institution ID format.',
            });
        }
        const institution = await Institution_1.Institution.findById(id).lean();
        if (!institution) {
            return res.status(404).json({
                success: false,
                message: 'Institution not found.',
            });
        }
        return res.json({
            success: true,
            data: institution,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Default premier Indian medical colleges to seed if empty
 */
const DEFAULT_PREMIER_MEDICAL_INSTITUTIONS = [
    { name: 'All India Institute of Medical Sciences (AIIMS), New Delhi', city: 'New Delhi', state: 'Delhi', type: 'INSTITUTE', usageCount: 100 },
    { name: 'AIIMS Bhopal', city: 'Bhopal', state: 'Madhya Pradesh', type: 'INSTITUTE', usageCount: 40 },
    { name: 'AIIMS Bhubaneswar', city: 'Bhubaneswar', state: 'Odisha', type: 'INSTITUTE', usageCount: 35 },
    { name: 'AIIMS Jodhpur', city: 'Jodhpur', state: 'Rajasthan', type: 'INSTITUTE', usageCount: 35 },
    { name: 'AIIMS Rishikesh', city: 'Rishikesh', state: 'Uttarakhand', type: 'INSTITUTE', usageCount: 30 },
    { name: 'AIIMS Raipur', city: 'Raipur', state: 'Chhattisgarh', type: 'INSTITUTE', usageCount: 30 },
    { name: 'AIIMS Patna', city: 'Patna', state: 'Bihar', type: 'INSTITUTE', usageCount: 30 },
    { name: 'AIIMS Nagpur', city: 'Nagpur', state: 'Maharashtra', type: 'INSTITUTE', usageCount: 45 },
    { name: 'Grant Government Medical College & Sir J.J. Group of Hospitals, Mumbai', city: 'Mumbai', state: 'Maharashtra', type: 'COLLEGE', usageCount: 95 },
    { name: 'Seth GS Medical College & KEM Hospital, Mumbai', city: 'Mumbai', state: 'Maharashtra', type: 'COLLEGE', usageCount: 90 },
    { name: 'Topiwala National Medical College & BYL Nair Hospital, Mumbai', city: 'Mumbai', state: 'Maharashtra', type: 'COLLEGE', usageCount: 75 },
    { name: 'Lokmanya Tilak Municipal Medical College (Sion Hospital), Mumbai', city: 'Mumbai', state: 'Maharashtra', type: 'COLLEGE', usageCount: 70 },
    { name: 'Armed Forces Medical College (AFMC), Pune', city: 'Pune', state: 'Maharashtra', type: 'COLLEGE', usageCount: 85 },
    { name: 'B.J. Government Medical College & Sassoon General Hospital, Pune', city: 'Pune', state: 'Maharashtra', type: 'COLLEGE', usageCount: 80 },
    { name: 'Christian Medical College (CMC), Vellore', city: 'Vellore', state: 'Tamil Nadu', type: 'COLLEGE', usageCount: 88 },
    { name: 'King George’s Medical University (KGMU), Lucknow', city: 'Lucknow', state: 'Uttar Pradesh', type: 'UNIVERSITY', usageCount: 82 },
    { name: 'Madras Medical College (MMC), Chennai', city: 'Chennai', state: 'Tamil Nadu', type: 'COLLEGE', usageCount: 80 },
    { name: 'Bangalore Medical College and Research Institute (BMCRI), Bengaluru', city: 'Bengaluru', state: 'Karnataka', type: 'COLLEGE', usageCount: 78 },
    { name: 'Post Graduate Institute of Medical Education and Research (PGIMER), Chandigarh', city: 'Chandigarh', state: 'Chandigarh', type: 'INSTITUTE', usageCount: 85 },
    { name: 'Jawaharlal Institute of Postgraduate Medical Education and Research (JIPMER), Puducherry', city: 'Puducherry', state: 'Puducherry', type: 'INSTITUTE', usageCount: 80 },
    { name: 'Maulana Azad Medical College (MAMC), New Delhi', city: 'New Delhi', state: 'Delhi', type: 'COLLEGE', usageCount: 82 },
    { name: 'Lady Hardinge Medical College, New Delhi', city: 'New Delhi', state: 'Delhi', type: 'COLLEGE', usageCount: 65 },
    { name: 'Kasturba Medical College (KMC), Manipal', city: 'Manipal', state: 'Karnataka', type: 'COLLEGE', usageCount: 70 },
    { name: 'Government Medical College (GMC), Nagpur', city: 'Nagpur', state: 'Maharashtra', type: 'COLLEGE', usageCount: 60 },
    { name: 'Dr. D. Y. Patil Medical College, Hospital and Research Centre, Pune', city: 'Pune', state: 'Maharashtra', type: 'COLLEGE', usageCount: 55 },
    { name: 'Tata Memorial Hospital, Mumbai', city: 'Mumbai', state: 'Maharashtra', type: 'HOSPITAL', usageCount: 75 },
];
/**
 * 4. SEED DEFAULT INSTITUTIONS
 * Automatically seeds premier Indian medical institutions on startup if empty
 */
async function seedDefaultInstitutionsIfEmpty() {
    try {
        const count = await Institution_1.Institution.countDocuments();
        if (count > 0)
            return;
        console.log('Seeding initial medical colleges & institutions into Wonderful Jodi database...');
        for (const item of DEFAULT_PREMIER_MEDICAL_INSTITUTIONS) {
            const normalized = (0, Institution_1.normalizeInstitutionName)(item.name);
            await Institution_1.Institution.updateOne({ normalizedName: normalized }, {
                $setOnInsert: {
                    name: item.name,
                    normalizedName: normalized,
                    type: item.type,
                    city: item.city,
                    state: item.state,
                    country: 'India',
                    usageCount: item.usageCount,
                    isVerified: true,
                },
            }, { upsert: true });
        }
        console.log(`Seeded ${DEFAULT_PREMIER_MEDICAL_INSTITUTIONS.length} premier medical institutions successfully.`);
    }
    catch (err) {
        console.warn('Notice while seeding medical institutions:', err);
    }
}
//# sourceMappingURL=institutionController.js.map