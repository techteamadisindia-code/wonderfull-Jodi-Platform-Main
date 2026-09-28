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
exports.JobOpening = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const jobOpeningSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Job title is required'],
        trim: true,
        maxlength: [150, 'Job title cannot exceed 150 characters'],
    },
    slug: {
        type: String,
        required: [true, 'Slug is required'],
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true,
        index: true,
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true,
    },
    workMode: {
        type: String,
        enum: {
            values: ['On-site', 'Hybrid', 'Remote'],
            message: '{VALUE} is not a valid work mode',
        },
        required: [true, 'Work mode is required'],
        default: 'On-site',
    },
    employmentType: {
        type: String,
        enum: {
            values: ['Full-time', 'Part-time', 'Internship', 'Contract'],
            message: '{VALUE} is not a valid employment type',
        },
        required: [true, 'Employment type is required'],
        default: 'Full-time',
    },
    experience: {
        type: String,
        trim: true,
        default: '',
    },
    salaryRange: {
        type: String,
        trim: true,
        default: '',
    },
    shortDescription: {
        type: String,
        required: [true, 'Short description is required'],
        trim: true,
        maxlength: [300, 'Short description cannot exceed 300 characters'],
    },
    fullDescription: {
        type: String,
        required: [true, 'Full description is required'],
        trim: true,
    },
    responsibilities: [{ type: String, trim: true }],
    requirements: [{ type: String, trim: true }],
    qualifications: [{ type: String, trim: true }],
    skills: [{ type: String, trim: true }],
    benefits: [{ type: String, trim: true }],
    applicationEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: 'careers@wonderfuljodi.com',
    },
    applicationUrl: {
        type: String,
        trim: true,
        default: '',
    },
    applicationDeadline: {
        type: Date,
        default: null,
    },
    status: {
        type: String,
        enum: {
            values: ['OPEN', 'CLOSED', 'DRAFT', 'ARCHIVED'],
            message: '{VALUE} is not a valid status',
        },
        default: 'OPEN',
        index: true,
    },
    isPublished: {
        type: Boolean,
        default: true,
        index: true,
    },
    displayOrder: {
        type: Number,
        default: 0,
    },
    createdBy: {
        type: String,
        trim: true,
        default: 'admin',
    },
    updatedBy: {
        type: String,
        trim: true,
        default: 'admin',
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
    deletedBy: {
        type: String,
        trim: true,
        default: null,
    },
}, {
    timestamps: true,
});
// Compound indexes for high-frequency queries
jobOpeningSchema.index({ isDeleted: 1, isPublished: 1, status: 1, displayOrder: 1, createdAt: -1 });
jobOpeningSchema.index({ slug: 1, isDeleted: 1 });
jobOpeningSchema.index({ department: 1, isDeleted: 1 });
exports.JobOpening = mongoose_1.default.models.JobOpening || mongoose_1.default.model('JobOpening', jobOpeningSchema);
//# sourceMappingURL=JobOpening.js.map