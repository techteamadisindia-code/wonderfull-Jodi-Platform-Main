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
exports.Setting = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const settingSchema = new mongoose_1.Schema({
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
exports.Setting = mongoose_1.default.models.Setting || mongoose_1.default.model('Setting', settingSchema);
//# sourceMappingURL=Setting.js.map