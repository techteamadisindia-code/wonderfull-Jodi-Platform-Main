"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KundaliReport = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const birthSnapshotSchema = new prismaBridge_1.Schema({
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
const kundaliReportSchema = new prismaBridge_1.Schema({
    user1: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    user2: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', index: true },
    partner1ProfileId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Profile', index: true },
    partner2ProfileId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Profile', index: true },
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
    ashtakootaDetails: { type: prismaBridge_1.Schema.Types.Mixed },
    dimensions: { type: prismaBridge_1.Schema.Types.Mixed },
    isCached: { type: Boolean, default: false },
}, { timestamps: true });
// Compound index to quickly find existing cached reports between users
kundaliReportSchema.index({ user1: 1, birthDataVersion: 1 });
kundaliReportSchema.index({ user1: 1, user2: 1 });
exports.KundaliReport = (0, prismaBridge_1.createPrismaModelAdapter)('kundaliReport', { "user1": "user1Id", "user2": "user2Id", "partner1Profile": "partner1ProfileId", "partner2Profile": "partner2ProfileId" });
//# sourceMappingURL=KundaliReport.js.map