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
exports.Report = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const reportSchema = new mongoose_1.Schema({
    reporter: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportedUser: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportedProfile: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Profile', index: true },
    reason: { type: String, required: true, trim: true, index: true },
    details: { type: String, trim: true },
    description: { type: String, trim: true },
    status: {
        type: String,
        enum: ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'REJECTED', 'ACTION_TAKEN'],
        default: 'PENDING',
        index: true,
    },
    moderator: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    handledByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
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
exports.Report = mongoose_1.default.models.Report || mongoose_1.default.model('Report', reportSchema);
//# sourceMappingURL=Report.js.map