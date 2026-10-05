"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const termsConfig_1 = require("../config/termsConfig");
const userSchema = new prismaBridge_1.Schema({
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    mobile: { type: String, required: true, unique: true, trim: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    verified: { type: Boolean, default: false },
    verificationStatus: {
        type: String,
        enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'],
        default: 'UNVERIFIED',
        index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    status: {
        type: String,
        enum: ['Active', 'Under Review', 'Suspended', 'Blocked', 'Deleted'],
        default: 'Active',
        index: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' },
    deletionReason: { type: String, trim: true },
    suspensionReason: { type: String, trim: true },
    suspendedAt: { type: Date },
    suspendedBy: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' },
    termsAccepted: { type: Boolean, default: false },
    termsVersion: { type: String, default: termsConfig_1.CURRENT_TERMS_VERSION },
    termsAcceptedAt: { type: Date },
}, { timestamps: true });
exports.User = (0, prismaBridge_1.createPrismaModelAdapter)('user');
//# sourceMappingURL=User.js.map