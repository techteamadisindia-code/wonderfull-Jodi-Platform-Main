"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Institution = void 0;
exports.normalizeInstitutionName = normalizeInstitutionName;
const prismaBridge_1 = require("../db/prismaBridge");
/**
 * Normalizes an institution name for duplicate detection:
 * - Trims leading and trailing whitespace
 * - Converts to lowercase
 * - Collapses consecutive whitespace into a single space
 * - Strips trailing punctuation
 */
function normalizeInstitutionName(name) {
    if (!name || typeof name !== 'string')
        return '';
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[.,;]+$/, '');
}
const institutionSchema = new prismaBridge_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 250,
        index: true,
    },
    normalizedName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['COLLEGE', 'UNIVERSITY', 'HOSPITAL', 'INSTITUTE'],
        default: 'COLLEGE',
        index: true,
    },
    city: {
        type: String,
        trim: true,
        default: '',
    },
    state: {
        type: String,
        trim: true,
        default: '',
    },
    country: {
        type: String,
        trim: true,
        default: 'India',
    },
    usageCount: {
        type: Number,
        default: 1,
        min: 1,
        index: true,
    },
    createdBy: {
        type: prismaBridge_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    isVerified: {
        type: Boolean,
        default: false,
        index: true,
    },
}, { timestamps: true });
// Indexes for rapid autocomplete and sorting
institutionSchema.index({ normalizedName: 1 });
institutionSchema.index({ usageCount: -1, name: 1 });
institutionSchema.index({ name: 'text', city: 'text', state: 'text' });
exports.Institution = (0, prismaBridge_1.createPrismaModelAdapter)('institution', { "createdBy": "createdById" });
//# sourceMappingURL=Institution.js.map