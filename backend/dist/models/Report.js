"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Report = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const reportSchema = new prismaBridge_1.Schema({
    reporter: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportedUser: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportedProfile: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Profile', index: true },
    reason: { type: String, required: true, trim: true, index: true },
    details: { type: String, trim: true },
    description: { type: String, trim: true },
    status: {
        type: String,
        enum: ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'REJECTED', 'ACTION_TAKEN'],
        default: 'PENDING',
        index: true,
    },
    moderator: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' },
    handledByAdminId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String, trim: true },
    adminNotes: { type: String, trim: true },
    actionTaken: {
        type: String,
        enum: [
            'NONE',
            'WARNING_SENT',
            'PROFILE_UNDER_REVIEW',
            'SUSPENDED',
            'BLOCKED',
            'DELETED',
            'RESOLVED',
            'DISMISSED',
            'ACCOUNT_BLOCKED',
        ],
        default: 'NONE',
    },
    targetType: {
        type: String,
        enum: ['PROFILE', 'MESSAGE', 'USER', 'OTHER'],
        default: 'PROFILE',
    },
    messageSnippet: { type: String, trim: true },
    resolvedAt: { type: Date },
}, { timestamps: true });
exports.Report = (0, prismaBridge_1.createPrismaModelAdapter)('report', { "reporter": "reporterId", "reportedUser": "reportedUserId", "reportedProfile": "reportedProfileId", "moderator": "moderatorId", "handledByAdminId": "handledByAdminId" });
//# sourceMappingURL=Report.js.map