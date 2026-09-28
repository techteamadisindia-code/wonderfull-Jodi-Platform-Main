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
exports.KundaliReport = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const birthSnapshotSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    gender: { type: String },
    dob: { type: Date, required: true },
    timeOfBirth: { type: String },
    placeOfBirth: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    timezone: { type: Number },
    rashiIndex: { type: Number },
    rashiName: { type: String },
    nakshatraIndex: { type: Number },
    nakshatraName: { type: String },
    pada: { type: Number },
    lagnaName: { type: String },
    manglikStatus: { type: String },
}, { _id: false });
const kundaliReportSchema = new mongoose_1.Schema({
    user1: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    user2: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    partner1ProfileId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Profile', index: true },
    partner2ProfileId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Profile', index: true },
    user1BirthDetails: { type: birthSnapshotSchema, required: true },
    user2BirthDetails: { type: birthSnapshotSchema, required: true },
    birthDataVersion: { type: String, required: true, index: true },
    gunaScore: { type: Number, required: true },
    varnaScore: { type: Number, required: true },
    vashyaScore: { type: Number, required: true },
    taraScore: { type: Number, required: true },
    yoniScore: { type: Number, required: true },
    grahaMaitriScore: { type: Number, required: true },
    ganaScore: { type: Number, required: true },
    bhakootScore: { type: Number, required: true },
    nadiScore: { type: Number, required: true },
    manglikStatusUser1: { type: String, default: 'Unable to determine' },
    manglikStatusUser2: { type: String, default: 'Unable to determine' },
    manglikAnalysis: { type: String, default: '' },
    compatibilityIndicator: { type: String, required: true },
    summary: { type: String, required: true },
    doshas: [{ type: String }],
    ashtakootaDetails: { type: mongoose_1.Schema.Types.Mixed },
    dimensions: { type: mongoose_1.Schema.Types.Mixed },
    isCached: { type: Boolean, default: false },
}, { timestamps: true });
// Compound index to quickly find existing cached reports between users
kundaliReportSchema.index({ user1: 1, birthDataVersion: 1 });
kundaliReportSchema.index({ user1: 1, user2: 1 });
exports.KundaliReport = mongoose_1.default.models.KundaliReport || mongoose_1.default.model('KundaliReport', kundaliReportSchema);
//# sourceMappingURL=KundaliReport.js.map