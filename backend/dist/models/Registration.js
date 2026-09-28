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
exports.Registration = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const registrationSchema = new mongoose_1.Schema({
    registrationId: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'],
        default: 'IN_PROGRESS',
        index: true,
    },
    currentStep: {
        type: Number,
        default: 1,
        min: 1,
        max: 10,
    },
    totalSteps: {
        type: Number,
        default: 4,
    },
    completionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
        index: true,
    },
    candidateName: {
        type: String,
        trim: true,
        default: '',
        index: true,
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        index: true,
    },
    mobile: {
        type: String,
        trim: true,
        index: true,
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other', ''],
        default: '',
    },
    stepData: {
        basicInfo: {
            fullName: { type: String, trim: true },
            email: { type: String, lowercase: true, trim: true },
            mobile: { type: String, trim: true },
            passwordHash: { type: String },
            gender: { type: String },
            dob: { type: String },
            lookingFor: { type: String },
            agreeTerms: { type: Boolean, default: false },
        },
        personalInfo: {
            maritalStatus: { type: String },
            motherTongue: { type: String },
            religion: { type: String },
            caste: { type: String },
            subCaste: { type: String },
            height: { type: String },
            city: { type: String },
            state: { type: String },
            country: { type: String },
            about: { type: String },
            aboutMe: { type: String },
            personalityValues: { type: String },
            hobbiesInterests: { type: String },
            careerGoals: { type: String },
            foodPreference: { type: String },
            smoking: { type: String },
            drinking: { type: String },
        },
        educationProfession: {
            education: { type: String },
            degree: { type: String },
            profession: { type: String },
            company: { type: String },
            workLocation: { type: String },
            annualIncome: { type: String },
            medicalRegistrationNumber: { type: String, trim: true },
            medicalCollege: { type: String, trim: true },
            medicalExperience: { type: String, trim: true },
        },
        familyDetails: {
            fatherOccupation: { type: String },
            motherOccupation: { type: String },
            siblings: { type: String },
            familyType: { type: String },
            familyStatus: { type: String },
            fatherName: { type: String },
            fatherProfession: { type: String },
            motherName: { type: String },
            motherProfession: { type: String },
            familyLocation: { type: String },
            familyValues: { type: String },
            aboutFamily: { type: String },
        },
        siblings: {
            brothersCount: { type: Number, default: 0 },
            sistersCount: { type: Number, default: 0 },
            brothers: [
                {
                    name: { type: String },
                    age: { type: Number },
                    profession: { type: String },
                    maritalStatus: { type: String },
                    location: { type: String },
                },
            ],
            sisters: [
                {
                    name: { type: String },
                    age: { type: Number },
                    profession: { type: String },
                    maritalStatus: { type: String },
                    location: { type: String },
                },
            ],
        },
        medicalQualifications: {
            undergraduate: [
                {
                    qualification: { type: String },
                    college: { type: String },
                    collegeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Institution' },
                    passingYear: { type: String },
                    status: { type: String },
                },
            ],
            postgraduate: [
                {
                    qualification: { type: String },
                    specialization: { type: String },
                    college: { type: String },
                    collegeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Institution' },
                    passingYear: { type: String },
                    status: { type: String },
                },
            ],
            doctorate: [
                {
                    qualification: { type: String },
                    specialization: { type: String },
                    college: { type: String },
                    collegeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Institution' },
                    passingYear: { type: String },
                    status: { type: String },
                },
            ],
        },
        partnerExpectations: {
            ageMin: { type: mongoose_1.Schema.Types.Mixed },
            ageMax: { type: mongoose_1.Schema.Types.Mixed },
            heightMin: { type: String },
            heightMax: { type: String },
            qualification: { type: String },
            specialization: { type: String },
            location: {
                country: { type: String },
                state: { type: String },
                city: { type: String },
            },
            willingToRelocate: { type: mongoose_1.Schema.Types.Mixed },
            maritalStatus: { type: String },
            lifestyle: {
                diet: { type: String },
                smoking: { type: String },
                drinking: { type: String },
            },
            familyExpectations: { type: String },
            additionalExpectations: { type: String },
        },
        preferences: {
            prefAgeMin: { type: String },
            prefAgeMax: { type: String },
            prefCity: { type: String },
            prefDiet: { type: String },
            lookingFor: { type: String },
            prefEducation: { type: String },
            prefProfession: { type: String },
        },
        photos: {
            primaryPhoto: { type: String },
            photos: [{ type: String }],
            idProofUrl: { type: String },
        },
        rawFormData: {
            type: mongoose_1.Schema.Types.Mixed,
            default: {},
        },
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    profile: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Profile',
        index: true,
    },
    resumeToken: {
        type: String,
        index: true,
    },
    startedAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
    lastActiveAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
    completedAt: {
        type: Date,
    },
    abandonedAt: {
        type: Date,
    },
    ipAddress: {
        type: String,
    },
    userAgent: {
        type: String,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
}, { timestamps: true });
// Compound indexes for high performance admin filtering & sorting
registrationSchema.index({ status: 1, lastActiveAt: -1 });
registrationSchema.index({ status: 1, currentStep: 1 });
registrationSchema.index({ status: 1, completionPercentage: -1 });
exports.Registration = mongoose_1.default.models.Registration || mongoose_1.default.model('Registration', registrationSchema);
//# sourceMappingURL=Registration.js.map