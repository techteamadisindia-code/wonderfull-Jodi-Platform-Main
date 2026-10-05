"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Award = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const awardSchema = new prismaBridge_1.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    logo: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    fullDescription: { type: String, default: '', trim: true },
    awardYear: { type: Number, required: true, index: true },
    category: { type: String, default: 'Excellence in Matrimony', trim: true, index: true },
    organization: { type: String, required: true, trim: true },
    galleryImages: [{ type: String, trim: true }],
    websiteUrl: { type: String, trim: true },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true,
});
// Compound indexes for public queries
awardSchema.index({ isActive: 1, isDeleted: 1, displayOrder: 1, awardYear: -1 });
awardSchema.index({ isFeatured: 1, isActive: 1, isDeleted: 1, displayOrder: 1 });
exports.Award = (0, prismaBridge_1.createPrismaModelAdapter)('award', { "deletedBy": "deletedById", "createdBy": "createdById", "updatedBy": "updatedById" });
//# sourceMappingURL=Award.js.map