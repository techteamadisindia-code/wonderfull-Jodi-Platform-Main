"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubCaste = exports.Caste = exports.Religion = exports.Language = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const languageSchema = new prismaBridge_1.Schema({
    name: { type: String, required: true, trim: true, unique: true, index: true },
    code: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    nativeNames: [{ type: String, trim: true }],
    isScheduled: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 999, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'Eighth Schedule to the Constitution of India' },
}, { timestamps: true });
const religionSchema = new prismaBridge_1.Schema({
    name: { type: String, required: true, trim: true, unique: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 999, index: true },
}, { timestamps: true });
const casteSchema = new prismaBridge_1.Schema({
    religionId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Religion', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    category: {
        type: String,
        enum: ['General', 'OBC', 'SC', 'ST', 'Other', 'Not Specified'],
        default: 'Not Specified',
        index: true,
    },
    aliases: [{ type: String, trim: true }],
    source: { type: String, default: 'Community Master' },
    sourceType: {
        type: String,
        enum: ['GOVERNMENT', 'LGD', 'DEPARTMENT_OF_SOCIAL_JUSTICE', 'HISTORICAL_REFERENCE', 'COMMUNITY_MASTER'],
        default: 'COMMUNITY_MASTER',
        index: true,
    },
    sourceReference: { type: String, trim: true },
    lastVerifiedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });
casteSchema.index({ religionId: 1, name: 1 }, { unique: true });
casteSchema.index({ name: 'text', aliases: 'text' });
const subCasteSchema = new prismaBridge_1.Schema({
    casteId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Caste', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    aliases: [{ type: String, trim: true }],
    source: { type: String, default: 'Community Master' },
    sourceType: { type: String, default: 'COMMUNITY_MASTER', index: true },
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });
subCasteSchema.index({ casteId: 1, name: 1 }, { unique: true });
exports.Language = (0, prismaBridge_1.createPrismaModelAdapter)('language');
exports.Religion = (0, prismaBridge_1.createPrismaModelAdapter)('religion');
exports.Caste = (0, prismaBridge_1.createPrismaModelAdapter)('caste', { religion: 'religionId', religionId: 'religionId' });
exports.SubCaste = (0, prismaBridge_1.createPrismaModelAdapter)('subCaste', { caste: 'casteId', casteId: 'casteId' });
//# sourceMappingURL=CommunityMaster.js.map