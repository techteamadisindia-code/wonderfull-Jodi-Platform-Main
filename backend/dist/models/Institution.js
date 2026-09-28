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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Institution = void 0;
exports.normalizeInstitutionName = normalizeInstitutionName;
const mongoose_1 = __importStar(require("mongoose"));
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
const institutionSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
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
exports.Institution = mongoose_1.default.models.Institution || mongoose_1.default.model('Institution', institutionSchema);
//# sourceMappingURL=Institution.js.map