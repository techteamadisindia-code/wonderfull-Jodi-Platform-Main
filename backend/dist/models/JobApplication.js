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
exports.JobApplication = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const jobApplicationSchema = new mongoose_1.Schema({
    jobId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'JobOpening',
        required: [true, 'Job ID is required'],
        index: true,
    },
    jobTitle: {
        type: String,
        required: [true, 'Job title is required'],
        trim: true,
    },
    candidateName: {
        type: String,
        required: [true, 'Candidate name is required'],
        trim: true,
        maxlength: [100, 'Candidate name cannot exceed 100 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email address is required'],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    mobile: {
        type: String,
        required: [true, 'Mobile number is required'],
        trim: true,
        minlength: [7, 'Please provide a valid phone number'],
    },
    experienceYears: {
        type: String,
        trim: true,
        default: '',
    },
    resumeUrl: {
        type: String,
        trim: true,
        default: '',
    },
    coverLetter: {
        type: String,
        trim: true,
        default: '',
        maxlength: [3000, 'Cover letter cannot exceed 3000 characters'],
    },
    status: {
        type: String,
        enum: {
            values: ['RECEIVED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'HIRED'],
            message: '{VALUE} is not a valid application status',
        },
        default: 'RECEIVED',
        index: true,
    },
    adminNotes: {
        type: String,
        trim: true,
        default: '',
    },
}, {
    timestamps: true,
});
jobApplicationSchema.index({ jobId: 1, createdAt: -1 });
jobApplicationSchema.index({ email: 1, jobId: 1 });
exports.JobApplication = mongoose_1.default.models.JobApplication ||
    mongoose_1.default.model('JobApplication', jobApplicationSchema);
//# sourceMappingURL=JobApplication.js.map