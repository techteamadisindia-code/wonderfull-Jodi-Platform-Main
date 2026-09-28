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
exports.Verification = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const verificationSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.Mixed,
    },
}, { timestamps: true });
// Compound indexes for optimized querying
verificationSchema.index({ user: 1, documentType: 1, status: 1 });
verificationSchema.index({ status: 1, createdAt: -1 });
verificationSchema.index({ createdAt: -1 });
exports.Verification = mongoose_1.default.models.Verification || mongoose_1.default.model('Verification', verificationSchema);
//# sourceMappingURL=Verification.js.map