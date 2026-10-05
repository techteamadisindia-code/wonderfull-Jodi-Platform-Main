"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Setting = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const settingSchema = new prismaBridge_1.Schema({
    siteName: { type: String, default: 'Wonderful Jodi' },
    supportEmail: { type: String, default: 'support@wonderfuljodi.com' },
    supportPhone: { type: String, default: '+91 096075 59547' },
    tollFreeNumber: { type: String, default: '+91 096075 59547' },
    officeAddress: { type: String, default: 'A303, Gera Imperium Gateway, Nashik Phata, PCMC, Pune, Maharashtra 411034' },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceBanner: { type: Boolean, default: false },
    maintenanceTitle: { type: String, default: "We'll Be Back Soon" },
    maintenanceMessage: {
        type: String,
        default: 'Wonderful Jodi is currently undergoing scheduled maintenance. Please check back shortly.',
    },
    maintenanceEstimatedEndTime: { type: Date, default: null },
    allowAdminAccess: { type: Boolean, default: true },
    maintenanceUpdatedBy: { type: String, default: '' },
    allowNewRegistrations: { type: Boolean, default: true },
    requireEmailVerification: { type: Boolean, default: false },
    requireManualProfileApproval: { type: Boolean, default: true },
    currency: { type: String, default: 'INR' },
    razorpayLiveMode: { type: Boolean, default: false },
    minAgeMale: { type: Number, default: 21 },
    minAgeFemale: { type: Number, default: 18 },
    maxPhotoUploadLimit: { type: Number, default: 6 },
}, { timestamps: true });
exports.Setting = (0, prismaBridge_1.createPrismaModelAdapter)('setting');
//# sourceMappingURL=Setting.js.map