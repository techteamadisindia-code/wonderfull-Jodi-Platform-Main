"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobOpening = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const jobOpeningSchema = new prismaBridge_1.Schema({
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
exports.JobOpening = (0, prismaBridge_1.createPrismaModelAdapter)('jobOpening', {
    work_mode: 'workMode',
    employment_type: 'employmentType',
    salary_range: 'salaryRange',
    short_description: 'shortDescription',
    full_description: 'fullDescription',
    application_email: 'applicationEmail',
    application_url: 'applicationUrl',
    application_deadline: 'applicationDeadline',
    is_published: 'isPublished',
    display_order: 'displayOrder',
    created_by: 'createdBy',
    updated_by: 'updatedBy',
    is_deleted: 'isDeleted',
    deleted_at: 'deletedAt',
    deleted_by: 'deletedBy',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
});
//# sourceMappingURL=JobOpening.js.map