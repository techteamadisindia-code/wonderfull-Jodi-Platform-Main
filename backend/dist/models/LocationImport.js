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
exports.LocationImport = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const locationExtractedRowSchema = new mongoose_1.Schema({
    state: { type: String, trim: true },
    stateCode: { type: String, trim: true },
    stateType: { type: String, enum: ['State', 'Union Territory'] },
    stateLgdCode: { type: String, trim: true },
    district: { type: String, trim: true },
    districtLgdCode: { type: String, trim: true },
    subDistrict: { type: String, trim: true },
    subDistrictType: { type: String, trim: true },
    subDistrictLgdCode: { type: String, trim: true },
    city: { type: String, trim: true },
    cityType: { type: String, trim: true },
    village: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    officialCode: { type: String, trim: true },
    status: { type: String, enum: ['VALID', 'DUPLICATE', 'INVALID'], default: 'VALID' },
    reason: { type: String, trim: true },
}, { _id: false });
const locationImportSchema = new mongoose_1.Schema({
    importId: { type: String, required: true, unique: true, index: true },
    fileName: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true },
    fileMimeType: { type: String, required: true, default: 'application/pdf' },
    uploadedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    adminEmail: { type: String, required: true, lowercase: true, trim: true },
    status: {
        type: String,
        enum: ['UPLOADED', 'PROCESSING', 'PREVIEW_READY', 'IMPORTED', 'PARTIALLY_IMPORTED', 'FAILED', 'CANCELLED'],
        default: 'UPLOADED',
        index: true,
    },
    source: { type: String, default: 'Local Government Directory (LGD) PDF' },
    sourceVersion: { type: String, trim: true },
    totalExtracted: { type: Number, default: 0 },
    validRecords: { type: Number, default: 0 },
    duplicateRecords: { type: Number, default: 0 },
    invalidRecords: { type: Number, default: 0 },
    missingStateRecords: { type: Number, default: 0 },
    missingDistrictRecords: { type: Number, default: 0 },
    missingCityRecords: { type: Number, default: 0 },
    insertedCount: { type: Number, default: 0 },
    updatedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    extractedPreview: [locationExtractedRowSchema],
    fullExtractedRecords: [locationExtractedRowSchema],
    importErrors: [
        {
            row: { type: Number },
            item: { type: String, trim: true },
            error: { type: String, required: true, trim: true },
        },
    ],
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
}, { timestamps: true });
exports.LocationImport = mongoose_1.default.models.LocationImport || mongoose_1.default.model('LocationImport', locationImportSchema);
//# sourceMappingURL=LocationImport.js.map