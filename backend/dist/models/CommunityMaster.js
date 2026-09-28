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
exports.SubCaste = exports.Caste = exports.Religion = exports.Language = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const languageSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true, unique: true, index: true },
    code: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    nativeNames: [{ type: String, trim: true }],
    isScheduled: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 999, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'Eighth Schedule to the Constitution of India' },
}, { timestamps: true });
const religionSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true, unique: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 999, index: true },
}, { timestamps: true });
const casteSchema = new mongoose_1.Schema({
    religionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Religion', required: true, index: true },
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
const subCasteSchema = new mongoose_1.Schema({
    casteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Caste', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    aliases: [{ type: String, trim: true }],
    source: { type: String, default: 'Community Master' },
    sourceType: { type: String, default: 'COMMUNITY_MASTER', index: true },
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });
subCasteSchema.index({ casteId: 1, name: 1 }, { unique: true });
exports.Language = mongoose_1.default.model('Language', languageSchema);
exports.Religion = mongoose_1.default.model('Religion', religionSchema);
exports.Caste = mongoose_1.default.model('Caste', casteSchema);
exports.SubCaste = mongoose_1.default.model('SubCaste', subCasteSchema);
//# sourceMappingURL=CommunityMaster.js.map