"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobApplication = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const jobApplicationSchema = new prismaBridge_1.Schema({
    jobId: {
        type: prismaBridge_1.Schema.Types.ObjectId,
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
exports.JobApplication = (0, prismaBridge_1.createPrismaModelAdapter)('jobApplication', { "job": "jobId" });
//# sourceMappingURL=JobApplication.js.map