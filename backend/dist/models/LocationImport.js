"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationImport = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const locationExtractedRowSchema = new prismaBridge_1.Schema({
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
const locationImportSchema = new prismaBridge_1.Schema({
    importId: { type: String, required: true, unique: true, index: true },
    fileName: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true },
    fileMimeType: { type: String, required: true, default: 'application/pdf' },
    uploadedBy: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
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
exports.LocationImport = (0, prismaBridge_1.createPrismaModelAdapter)('locationImport', { "uploadedBy": "uploadedById" });
//# sourceMappingURL=LocationImport.js.map