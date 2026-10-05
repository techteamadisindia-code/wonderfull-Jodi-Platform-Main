"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Verification = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const verificationSchema = new prismaBridge_1.Schema({
    user: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentType: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    documentName: {
        type: String,
        required: true,
        trim: true,
        default: 'Verification Document',
    },
    documentUrl: {
        type: String,
        required: true,
        trim: true,
    },
    storageKey: {
        type: String,
        trim: true,
    },
    fileType: {
        type: String,
        trim: true,
        default: 'application/pdf',
    },
    fileSize: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
        index: true,
    },
    submittedAt: {
        type: Date,
        default: Date.now,
    },
    reviewedAt: {
        type: Date,
    },
    reviewedBy: {
        type: prismaBridge_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    reviewedByEmail: {
        type: String,
        trim: true,
    },
    adminNotes: {
        type: String,
        trim: true,
    },
    rejectionReason: {
        type: String,
        trim: true,
    },
    attemptNumber: {
        type: Number,
        default: 1,
    },
    metadata: {
        type: prismaBridge_1.Schema.Types.Mixed,
    },
}, { timestamps: true });
// Compound indexes for optimized querying
verificationSchema.index({ user: 1, documentType: 1, status: 1 });
verificationSchema.index({ status: 1, createdAt: -1 });
verificationSchema.index({ createdAt: -1 });
exports.Verification = (0, prismaBridge_1.createPrismaModelAdapter)('verification', { "user": "userId", "reviewedBy": "reviewedById" });
//# sourceMappingURL=Verification.js.map